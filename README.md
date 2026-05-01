# SAATHI — Smart AI-Assisted Triage & Healthcare Interface

> **An offline-capable, AI-assisted OPD triage prototype for Pakistan's
> resource-limited public hospitals.**

---

## Overview

Pakistan's doctor-to-patient ratio of **1:1,300** — well below the
WHO-recommended 1:1,000 — means that most public OPDs process well over
1,200 patients daily with **no structured triage system**.  Life-threatening
presentations are routinely missed until it is too late.

**SAATHI** addresses this gap.  A paramedic enters four vital signs and a
chief complaint into a low-cost (~USD 90) Android tablet.  A locally
pre-trained **Gradient Boosted Classifier (GBC)** instantly assigns the
patient to one of three priority categories:

| Category | Colour | Meaning |
|---|---|---|
| **Immediate** | 🔴 Red | Critical — physician review NOW |
| **Urgent** | 🟠 Amber | High-priority — seen within 30 min |
| **Routine** | 🟢 Green | Standard queue |

The system runs **fully offline**, requires **no hospital IT
infrastructure**, and supports **English, Urdu, and regional languages**.

---

## Repository Structure

```
saathi/
├── saathi_model.py        ← GBC training & inference pipeline
├── saathi_ui.py           ← Desktop/tablet prototype UI (Tkinter)
├── requirements.txt       ← Python dependencies
├── models/                ← Auto-created on first training run
│   ├── saathi_gbc_model.pkl
│   ├── scaler.pkl
│   ├── label_encoder.pkl
│   ├── confusion_matrix.png
│   └── feature_importance.png
├── slips/                 ← Auto-created; printed triage slips (.txt)
└── README.md
```

---

## Quickstart

### 1. Clone

```bash
git clone https://github.com/<your-handle>/saathi.git
cd saathi
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Train the model

```bash
python saathi_model.py
```

This will:
- Generate a 5,000-record synthetic OPD dataset (proxy for real OPD registers)
- Train the Gradient Boosted Classifier
- Print accuracy, AUC, and a 5-fold cross-validation report
- Save the model to `models/`
- Save evaluation plots to `models/`

### 4. Launch the prototype UI

```bash
python saathi_ui.py
```

---

## Machine Learning Pipeline

### Input Features

| Feature | Description | Range |
|---|---|---|
| `spo2` | Oxygen saturation (%) | 60 – 100 |
| `sbp` | Systolic blood pressure (mmHg) | 60 – 250 |
| `dbp` | Diastolic blood pressure (mmHg) | 40 – 150 |
| `temperature` | Body temperature (°C) | 34 – 43 |
| `heart_rate` | Heart rate (bpm) | 30 – 220 |
| `complaint` | Chief complaint (integer code) | 0 – 9 |

### Model: `GradientBoostingClassifier`

```python
GradientBoostingClassifier(
    n_estimators   = 300,
    learning_rate  = 0.08,
    max_depth      = 4,
    subsample      = 0.8,
    max_features   = "sqrt",
    random_state   = 42,
)
```

**Why GBC?**
- Handles mixed numeric + categorical features without one-hot explosion
- Robust to the class imbalance typical of OPD registers (many Routine,
  fewer Immediate presentations)
- Excellent probability calibration — essential for reliable confidence
  scores on the triage slip
- Low inference latency: suitable for ONNX export and Android deployment

### Expected Performance (Synthetic Dataset — for proof of concept only)

| Metric | Value |
|---|---|
| Accuracy | ≥ 0.95 |
| Macro AUC (OvR) | ≥ 0.97 |
| Sensitivity – Immediate | ≥ 0.95 |
| Specificity – Immediate | ≥ 0.97 |

> ⚠ **These figures are from a synthetic dataset.**  Actual performance
> will be established during prospective clinical validation at district
> hospitals.  Sensitivity and specificity for the **Immediate** category
> are the primary clinical endpoints.

---

## Prototype UI — Feature Summary

| Feature | Status |
|---|---|
| English interface | ✅ |
| Urdu transliteration interface | ✅ |
| Real-time vital-sign range validation | ✅ |
| GBC model inference | ✅ |
| Rule-based fallback (no model file) | ✅ |
| Colour-coded triage result card | ✅ |
| Clinical flag auto-detection | ✅ |
| Triage slip print / save (.txt) | ✅ |
| Model confidence display | ✅ |
| Android tablet adaptation (planned) | 🔜 |
| Offline ONNX model export (planned) | 🔜 |
| Thermal printer integration (planned) | 🔜 |

---

## Hardware Target

| Component | Specification | Approx. Cost (USD) |
|---|---|---|
| Android tablet | Any Android 10+ device, 10" screen | ~60 |
| Pulse oximeter | Finger-clip SpO₂ sensor with BLE | ~10 |
| Digital thermometer | Infrared or oral | ~8 |
| BP cuff | Aneroid or digital | ~12 |
| **Total per deployment unit** | | **~90** |

---

## Ethical Considerations

- **Clinical decision-support only.**  A qualified physician retains full
  responsibility for all patient management decisions.
- **Dataset bias.**  Early training phases with limited local data may
  under-represent certain demographic groups.  Iterative re-training on
  growing OPD datasets will be mandatory.
- **IRB approval** for patient data collection will be sought from the
  relevant institutional review boards before any clinical validation.
- **No patient data** is included in this repository.  The synthetic
  dataset is generated procedurally and contains no real patient records.

---

## Roadmap

- [ ] Prospective data collection at Nishtar Hospital, Multan (Phase 1)
- [ ] Local model re-training on anonymised OPD registers
- [ ] ONNX export and Android APK packaging
- [ ] Thermal printer integration (OPD slip)
- [ ] District hospital pilot (Phase 2 validation)
- [ ] National integration study under Pakistan UHC initiative

---

## Authors

**Muhammad Aayan Malik** *et al.*  
Nishtar Medical University, Multan, Pakistan

---

## Disclaimer

SAATHI is a **prototype** submitted for academic and proof-of-concept
purposes.  It has **not** undergone clinical validation and must **not**
be used for real patient triage decisions until prospective clinical
validation is complete and regulatory approval is obtained.

---

## License

MIT License — see `LICENSE` for details.
