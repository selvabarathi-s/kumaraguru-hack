## CV Training Flow

This CV pipeline is now designed in two parts:

1. Primary divider:
   `ewaste` vs `mixed_waste`
2. Optional secondary divider for mixed waste:
   `glass`, `medical`, `plastic`, `paper`, `metal`, `organic`, `textile`

### Dataset layout

Create the dataset inside `cv-service/data/` like this:

```text
cv-service/data/
  mobile_phone/
  laptop/
  circuit_board/
  battery/
  cable_wire/
  monitor_screen/
  appliance/
  keyboard/
  mouse/
  printer/
  router/
  tablet/
  glass/
  medical/
  plastic/
  paper/
  metal/
  organic/
  textile/
```

### Training priority

- Keep most images in the e-waste folders.
- Add mixed-waste folders only as secondary support so the model can separate obvious non e-waste contamination.
- For best results, collect many more images for the e-waste folders than the mixed-waste folders.

### Train

```powershell
cd cv-service
python train.py
```

Optional:

```powershell
$env:CV_DATA_DIR="D:\path\to\dataset"
$env:CV_EPOCHS="12"
$env:CV_BATCH_SIZE="16"
python train.py
```

### Current limitation

The app currently estimates objects by image-region segmentation and then classifies each region. For accurate per-object counts and bounding boxes, the next upgrade should be a real detection model such as YOLO.
