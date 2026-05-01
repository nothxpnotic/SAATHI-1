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
infrastructure**, and supports **English and Urdu**.

---

### Input Features

| Feature | Description | Range |
|---|---|---|
| `spo2` | Oxygen saturation (%) | 60 – 100 |
| `sbp` | Systolic blood pressure (mmHg) | 60 – 250 |
| `heart_rate` | Heart rate (bpm) | 30 – 220 |
| `temperature` | Body temperature (°C) | 34 – 43 |
| `respiratory_rate` | Respiratory rate (/min) | 12 – 20 |
| `gcs_eye` | GCS — Eye opening | 1 – 4 |
| `gcs_verbal` | GCS — Verbal response | 1 – 5 |
| `gcs_motor` | GCS — Motor response | 1 – 6 |
| `mobility` | Patient mobility status | `walking_unaided` / `stretcher_assisted` |
| `vision_complaint` | Vision symptom | `none_normal` / `blurred_painful` / `sudden_loss` |
| `injury_site` | Site of injury | `none` / `head` / `neck` / `chest` / `abdomen` |
| `pain_score` | Self-reported pain score | 1 – 10 |

---

## Prototype UI — Feature Summary

| Feature | Status |
|---|---|
| English interface | ✅ |
| Urdu translation interface | ✅ |
| Real-time vital-sign range validation | ✅ |
| GBC model inference | ✅ |
| Rule-based fallback (no model file) | ✅ |
| Colour-coded triage result card | ✅ |
| Clinical flag auto-detection | ✅ |
| Triage slip print | ✅ |
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
