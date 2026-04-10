import json
import os
from collections import Counter

from PIL import Image
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import models, transforms
from torchvision.models import ResNet18_Weights

from class_config import DEFAULT_MODEL_CLASSES, EWASTE_ITEM_CLASSES, SECONDARY_MIXED_CLASSES

VALID_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")
MAX_IMAGES_PER_CLASS = int(os.environ.get("CV_MAX_PER_CLASS", "100"))


def filter_none_collate_fn(batch):
    batch = [b for b in batch if b is not None]
    if len(batch) == 0:
        return None
    return torch.utils.data.default_collate(batch)


class EwasteDataset(Dataset):
    def __init__(self, image_dir, classes, transform=None):
        self.classes = classes
        self.transform = transform
        self.samples = []

        for class_idx, class_name in enumerate(classes):
            class_dir = os.path.join(image_dir, class_name)
            if not os.path.isdir(class_dir):
                continue
            selected_files = [
                filename
                for filename in sorted(os.listdir(class_dir))
                if filename.lower().endswith(VALID_EXTENSIONS)
            ][:MAX_IMAGES_PER_CLASS]
            for filename in selected_files:
                if filename.lower().endswith(VALID_EXTENSIONS):
                    self.samples.append((os.path.join(class_dir, filename), class_idx))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            image = Image.open(path).convert("RGB")
        except Exception:
            return None
        if self.transform:
            image = self.transform(image)
        return image, label


def discover_classes(data_dir):
    if not os.path.isdir(data_dir):
        return list(DEFAULT_MODEL_CLASSES)

    class_dirs = []
    for name in sorted(os.listdir(data_dir)):
        class_path = os.path.join(data_dir, name)
        if not os.path.isdir(class_path):
            continue
        has_images = any(
            filename.lower().endswith(VALID_EXTENSIONS)
            for filename in os.listdir(class_path)
        )
        if has_images:
            class_dirs.append(name)
    if not class_dirs:
        return list(DEFAULT_MODEL_CLASSES)

    ordered = [name for name in DEFAULT_MODEL_CLASSES if name in class_dirs]
    extras = [name for name in class_dirs if name not in ordered]
    return ordered + extras


def build_model(num_classes):
    weights = ResNet18_Weights.DEFAULT
    model = models.resnet18(weights=weights)
    for param in model.parameters():
        param.requires_grad = False
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def make_transforms():
    normalize = transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    )

    train_transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(12),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            normalize,
        ]
    )

    eval_transform = transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.CenterCrop((224, 224)),
            transforms.ToTensor(),
            normalize,
        ]
    )
    return train_transform, eval_transform


def summarize_dataset(dataset, classes):
    counts = Counter(classes[label] for _, label in dataset.samples)
    print("Dataset summary:")
    ewaste_total = 0
    mixed_total = 0
    for class_name in classes:
        class_count = counts.get(class_name, 0)
        if class_name in EWASTE_ITEM_CLASSES:
            ewaste_total += class_count
        elif class_name in SECONDARY_MIXED_CLASSES:
            mixed_total += class_count
        print(f"  {class_name}: {class_count}")
    print(f"Primary totals -> ewaste: {ewaste_total}, mixed_waste: {mixed_total}")


def train_model(data_dir, epochs=8, batch_size=16, save_path="ewaste_classifier.pth"):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    classes = discover_classes(data_dir)
    train_transform, eval_transform = make_transforms()
    base_dataset = EwasteDataset(data_dir, classes, transform=None)

    if len(base_dataset) == 0:
        raise RuntimeError(
            f"No training images found in {data_dir}. Create one folder per class and add images before training."
        )

    summarize_dataset(base_dataset, classes)

    train_size = max(1, int(len(base_dataset) * 0.8))
    val_size = max(1, len(base_dataset) - train_size)
    if train_size + val_size > len(base_dataset):
        train_size = len(base_dataset) - val_size

    train_subset, val_subset = random_split(
        list(range(len(base_dataset))),
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42),
    )

    train_dataset = EwasteDataset(data_dir, classes, transform=train_transform)
    val_dataset = EwasteDataset(data_dir, classes, transform=eval_transform)
    train_dataset.samples = [train_dataset.samples[i] for i in train_subset.indices]
    val_dataset.samples = [val_dataset.samples[i] for i in val_subset.indices]

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        collate_fn=filter_none_collate_fn,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        collate_fn=filter_none_collate_fn,
    )

    model = build_model(len(classes)).to(device)
    optimizer = optim.Adam(model.fc.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.5)

    best_val_acc = 0.0
    best_metrics = {}

    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            predictions = outputs.argmax(dim=1)
            train_total += labels.size(0)
            train_correct += (predictions == labels).sum().item()

        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device)
                labels = labels.to(device)
                outputs = model(images)
                predictions = outputs.argmax(dim=1)
                val_total += labels.size(0)
                val_correct += (predictions == labels).sum().item()

        train_acc = train_correct / max(train_total, 1)
        val_acc = val_correct / max(val_total, 1)
        avg_loss = running_loss / max(len(train_loader), 1)
        scheduler.step()

        print(
            f"Epoch {epoch + 1}/{epochs} | loss={avg_loss:.4f} | train_acc={train_acc:.4f} | val_acc={val_acc:.4f}"
        )

        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            best_metrics = {
                "train_accuracy": round(train_acc, 4),
                "validation_accuracy": round(val_acc, 4),
                "epochs": epochs,
                "batch_size": batch_size,
                "num_classes": len(classes),
                "samples": len(base_dataset),
                "model": "resnet18_transfer",
                "training_priority": "ewaste_primary_mixed_secondary",
                "ewaste_classes": [cls for cls in classes if cls in EWASTE_ITEM_CLASSES],
                "mixed_classes": [cls for cls in classes if cls in SECONDARY_MIXED_CLASSES],
                "max_images_per_class": MAX_IMAGES_PER_CLASS,
            }
            torch.save(
                {
                    "state_dict": model.state_dict(),
                    "classes": classes,
                    "metrics": best_metrics,
                },
                save_path,
            )
            print(f"  saved checkpoint to {save_path}")

    print("Training complete.")
    print(json.dumps(best_metrics, indent=2))
    return model, best_metrics


if __name__ == "__main__":
    current_dir = os.path.dirname(__file__)
    data_dir = os.environ.get(
        "CV_DATA_DIR",
        os.path.join(current_dir, "data"),
    )
    model_path = os.environ.get(
        "CV_MODEL_PATH", os.path.join(current_dir, "ewaste_classifier.pth")
    )
    epochs = int(os.environ.get("CV_EPOCHS", "8"))
    batch_size = int(os.environ.get("CV_BATCH_SIZE", "16"))

    train_model(data_dir, epochs=epochs, batch_size=batch_size, save_path=model_path)
