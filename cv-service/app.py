import base64
from collections import Counter
import io
import os

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
from PIL import Image, ImageFilter
import torch
import torch.nn.functional as F
from torchvision import models, transforms

from class_config import (
    DEFAULT_MODEL_CLASSES,
    EWASTE_ITEM_CLASSES,
    PRIMARY_CATEGORIES,
    SECONDARY_MIXED_CLASSES,
    get_class_metadata,
    get_primary_category,
    is_ewaste_class,
)

app = Flask(__name__)
CORS(app)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ewaste_classifier.pth")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = None
model_classes = list(DEFAULT_MODEL_CLASSES)
model_metrics = {}
checkpoint_loaded = False

transform = transforms.Compose(
    [
        transforms.Resize((256, 256)),
        transforms.CenterCrop((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


def build_model(num_classes):
    backbone = models.resnet18(weights=None)
    backbone.fc = torch.nn.Linear(backbone.fc.in_features, num_classes)
    return backbone.to(device)


def load_model():
    global model, model_classes, model_metrics, checkpoint_loaded
    model_classes = list(DEFAULT_MODEL_CLASSES)
    model_metrics = {}
    checkpoint_loaded = False
    model = build_model(len(model_classes))

    if os.path.exists(MODEL_PATH):
        checkpoint = torch.load(MODEL_PATH, map_location=device)
        if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
            model_classes = checkpoint.get("classes", model_classes)
            model_metrics = checkpoint.get("metrics", {})
            model = build_model(len(model_classes))
            model.load_state_dict(checkpoint["state_dict"])
        else:
            model.load_state_dict(checkpoint)
        checkpoint_loaded = True
        print(f"Loaded CV model from {MODEL_PATH}")
    else:
        print("No pretrained model found. Using random weights - train first for accurate results.")

    model.eval()


def read_image_from_request():
    if "image" in request.files:
        return request.files["image"].read()

    payload = request.get_json(silent=True) or {}
    b64_str = payload.get("image_b64")
    if not b64_str:
        return None
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    return base64.b64decode(b64_str)


def count_object_regions(image):
    preview = image.copy()
    preview.thumbnail((640, 640))

    gray = preview.convert("L").filter(ImageFilter.GaussianBlur(radius=2))
    arr = np.array(gray, dtype=np.uint8)

    edge_map = np.array(gray.filter(ImageFilter.FIND_EDGES), dtype=np.uint8)
    contrast_mask = np.abs(arr.astype(np.int16) - int(np.median(arr))) > 28
    edge_mask = edge_map > 22
    mask = np.logical_or(edge_mask, contrast_mask)

    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    min_area = max(350, int(h * w * 0.003))
    max_area = int(h * w * 0.65)
    regions = []

    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue

            stack = [(y, x)]
            visited[y, x] = True
            area = 0
            min_x = max_x = x
            min_y = max_y = y

            while stack:
                cy, cx = stack.pop()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)

                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))

            box_w = max_x - min_x + 1
            box_h = max_y - min_y + 1
            aspect_ratio = box_w / max(box_h, 1)

            if area < min_area or area > max_area:
                continue
            if box_w < 20 or box_h < 20:
                continue
            if aspect_ratio > 8 or aspect_ratio < 0.12:
                continue

            regions.append(
                {
                    "x": int(min_x),
                    "y": int(min_y),
                    "width": int(box_w),
                    "height": int(box_h),
                    "area": int(area),
                }
            )

    regions.sort(key=lambda item: item["area"], reverse=True)
    return {
        "object_count": len(regions[:12]),
        "object_regions": regions[:12],
        "count_method": "approximate_region_count",
    }


def classify_pil_image(image):
    input_tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(input_tensor)
        probs = F.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)

    idx = predicted.item()
    class_name = model_classes[idx]
    meta = get_class_metadata(class_name)
    is_ewaste = is_ewaste_class(class_name)
    count_info = count_object_regions(image)

    ranked = sorted(
        (
            {
                "class_name": cls,
                "display_name": get_class_metadata(cls)["display_name"],
                "probability": round(float(probs[0][i]), 4),
            }
            for i, cls in enumerate(model_classes)
        ),
        key=lambda item: item["probability"],
        reverse=True,
    )
    return class_name, meta, is_ewaste, round(confidence.item(), 4), ranked


def predict_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    class_name, meta, is_ewaste, confidence_val, ranked = classify_pil_image(image)
    count_info = count_object_regions(image)
    primary_category = get_primary_category(class_name)
    secondary_category = class_name if primary_category == "mixed_waste" else None

    scale_x = image.width / max(min(image.width, 640), 1)
    scale_y = image.height / max(min(image.height, 640), 1)

    detected_objects = []
    class_counter = Counter()
    primary_counter = Counter()
    ewaste_object_count = 0
    mixed_object_count = 0

    for index, region in enumerate(count_info["object_regions"], start=1):
        x1 = max(0, int(region["x"] * scale_x))
        y1 = max(0, int(region["y"] * scale_y))
        x2 = min(image.width, int((region["x"] + region["width"]) * scale_x))
        y2 = min(image.height, int((region["y"] + region["height"]) * scale_y))

        if x2 - x1 < 10 or y2 - y1 < 10:
            continue

        crop = image.crop((x1, y1, x2, y2))
        obj_class, obj_meta, obj_is_ewaste, obj_confidence, obj_ranked = classify_pil_image(crop)
        class_counter[obj_class] += 1
        obj_primary = get_primary_category(obj_class)
        primary_counter[obj_primary] += 1
        if obj_is_ewaste:
            ewaste_object_count += 1
        else:
            mixed_object_count += 1

        detected_objects.append(
            {
                "id": index,
                "primary_category": obj_primary,
                "secondary_category": obj_class if obj_primary == "mixed_waste" else None,
                "predicted_class": obj_class,
                "display_name": obj_meta["display_name"],
                "confidence": obj_confidence,
                "is_ewaste": obj_is_ewaste,
                "device_category": obj_meta["device_category"],
                "bbox": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
                "top_predictions": obj_ranked[:3],
            }
        )

    class_counts = [
        {
            "class_name": cls,
            "display_name": get_class_metadata(cls)["display_name"],
            "count": count,
        }
        for cls, count in class_counter.most_common()
    ]
    primary_class_counts = [
        {"category": category, "count": primary_counter.get(category, 0)}
        for category in PRIMARY_CATEGORIES
        if primary_counter.get(category, 0) > 0
    ]
    mixed_class_counts = [
        {
            "class_name": cls,
            "display_name": get_class_metadata(cls)["display_name"],
            "count": count,
        }
        for cls, count in class_counter.most_common()
        if cls in SECONDARY_MIXED_CLASSES
    ]
    ewaste_class_counts = [
        {
            "class_name": cls,
            "display_name": get_class_metadata(cls)["display_name"],
            "count": count,
        }
        for cls, count in class_counter.most_common()
        if cls in EWASTE_ITEM_CLASSES
    ]

    return {
        "primary_category": primary_category,
        "secondary_category": secondary_category,
        "predicted_class": class_name,
        "display_name": meta["display_name"],
        "confidence": confidence_val,
        "is_ewaste": is_ewaste,
        "device_category": meta["device_category"],
        "estimated_weight_kg": meta["estimated_weight_kg"],
        "handling_instructions": meta["handling_instructions"],
        "all_probabilities": {item["class_name"]: item["probability"] for item in ranked},
        "top_predictions": ranked[:3],
        "object_count": len(detected_objects),
        "ewaste_object_count": ewaste_object_count,
        "mixed_object_count": mixed_object_count,
        "object_regions": count_info["object_regions"],
        "count_method": count_info["count_method"],
        "primary_class_counts": primary_class_counts,
        "class_counts": class_counts,
        "ewaste_class_counts": ewaste_class_counts,
        "mixed_class_counts": mixed_class_counts,
        "detected_objects": detected_objects,
    }


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "ok": True,
            "model_loaded": model is not None,
            "checkpoint_loaded": checkpoint_loaded,
            "classes": model_classes,
            "class_count": len(model_classes),
            "primary_categories": PRIMARY_CATEGORIES,
            "ewaste_classes": EWASTE_ITEM_CLASSES,
            "mixed_classes": SECONDARY_MIXED_CLASSES,
            "device": str(device),
            "metrics": model_metrics,
        }
    )


@app.route("/classify", methods=["POST"])
def classify():
    image_bytes = read_image_from_request()
    if not image_bytes:
        return jsonify({"error": "Provide an image file or base64 in image_b64 field"}), 400

    try:
        return jsonify(predict_image(image_bytes))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/classify/batch", methods=["POST"])
def classify_batch():
    files = request.files.getlist("images")
    if not files:
        return jsonify({"error": "Provide images as multipart files"}), 400

    results = []
    for file_item in files:
        try:
            result = predict_image(file_item.read())
            result["filename"] = file_item.filename
            results.append(result)
        except Exception as exc:
            results.append({"filename": file_item.filename, "error": str(exc)})

    ewaste_count = sum(1 for item in results if item.get("is_ewaste"))
    return jsonify(
        {
            "total": len(results),
            "ewaste_detected": ewaste_count,
            "non_ewaste": len(results) - ewaste_count,
            "results": results,
        }
    )


load_model()


# ─── Condition inference helpers ──────────────────────────────────────────

CONDITION_CLASSES = ["good", "repairable", "damaged", "scrap"]


def infer_condition(confidence: float, primary_category: str, class_name: str) -> str:
    """
    Heuristically estimate device condition from classifier output.
    A real production system would use a dedicated damage-detection model.
    """
    if primary_category != "ewaste":
        return "scrap"
    # Very high confidence on a clean class  →  good
    if confidence >= 0.80:
        return "good"
    if confidence >= 0.60:
        return "repairable"
    if confidence >= 0.40:
        return "damaged"
    return "scrap"


def aggregate_multi_image(results: list[dict]) -> dict:
    """
    Combine predictions from multiple images using a confidence-weighted vote.
    """
    if len(results) == 1:
        return results[0]

    # Accumulate per-class weighted probabilities
    class_scores: dict[str, float] = {}
    total_weight = 0.0

    for r in results:
        w = r["confidence"]
        total_weight += w
        for cls, prob in r.get("all_probabilities", {}).items():
            class_scores[cls] = class_scores.get(cls, 0.0) + prob * w

    if total_weight == 0:
        return results[0]

    for cls in class_scores:
        class_scores[cls] /= total_weight

    best_class = max(class_scores, key=lambda c: class_scores[c])
    best_conf = class_scores[best_class]

    meta = get_class_metadata(best_class)
    is_ew = is_ewaste_class(best_class)
    primary = get_primary_category(best_class)

    sorted_preds = sorted(
        [{"class_name": c, "display_name": get_class_metadata(c)["display_name"], "probability": round(p, 4)}
         for c, p in class_scores.items()],
        key=lambda x: x["probability"],
        reverse=True,
    )

    return {
        "predicted_class": best_class,
        "display_name": meta["display_name"],
        "confidence": round(best_conf, 4),
        "is_ewaste": is_ew,
        "primary_category": primary,
        "device_category": meta["device_category"],
        "estimated_weight_kg": meta["estimated_weight_kg"],
        "handling_instructions": meta["handling_instructions"],
        "all_probabilities": {k: round(v, 4) for k, v in class_scores.items()},
        "top_predictions": sorted_preds[:3],
        "images_analyzed": len(results),
    }


@app.route("/detect-device", methods=["POST"])
def detect_device():
    """
    Accepts 1–5 images as multipart 'images' field.
    Returns device type, condition, and structured prediction data
    for material-recovery calculation in the Node.js backend.
    """
    files = request.files.getlist("images")
    if not files:
        return jsonify({"error": "Provide 1–5 images as multipart 'images' fields"}), 400
    if len(files) > 5:
        return jsonify({"error": "Maximum 5 images allowed"}), 400

    per_image_results = []
    for f in files:
        try:
            result = predict_image(f.read())
            result["filename"] = f.filename
            per_image_results.append(result)
        except Exception as exc:
            # Skip bad images but don't crash the whole request
            per_image_results.append({
                "filename": f.filename,
                "error": str(exc),
                "predicted_class": "unknown",
                "confidence": 0.0,
                "all_probabilities": {},
                "is_ewaste": False,
                "primary_category": "mixed_waste",
                "device_category": None,
                "estimated_weight_kg": 0,
                "top_predictions": [],
                "display_name": "Unknown",
                "handling_instructions": "",
            })

    valid = [r for r in per_image_results if "error" not in r]
    if not valid:
        return jsonify({"error": "All images failed to process", "details": per_image_results}), 422

    aggregated = aggregate_multi_image(valid)
    condition = infer_condition(
        aggregated["confidence"],
        aggregated["primary_category"],
        aggregated["predicted_class"],
    )

    return jsonify({
        "device_type": aggregated["predicted_class"],
        "device_display": aggregated["display_name"],
        "condition": condition,
        "confidence": aggregated["confidence"],
        "is_ewaste": aggregated["is_ewaste"],
        "primary_category": aggregated["primary_category"],
        "device_category": aggregated["device_category"],
        "estimated_weight_kg": aggregated["estimated_weight_kg"],
        "handling_instructions": aggregated["handling_instructions"],
        "top_predictions": aggregated["top_predictions"],
        "all_probabilities": aggregated["all_probabilities"],
        "images_analyzed": len(valid),
        "per_image_results": [
            {
                "filename": r.get("filename", ""),
                "predicted_class": r.get("predicted_class", ""),
                "confidence": r.get("confidence", 0),
            }
            for r in per_image_results
        ],
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=False)
