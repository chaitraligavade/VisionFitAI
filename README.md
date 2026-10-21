# Virtual Trial Room (VTR)

> Try clothes on digitally — real-time clothing overlay using computer vision and body pose estimation.

---

## The Problem

Online shoppers can't tell how clothes will actually fit them. Return rates in fashion e-commerce are as high as 40% — largely because of fit uncertainty. VTR bridges that gap by letting users see how an item looks on their actual body, in real time, before buying.

---

## What it does

VTR uses a live webcam feed or static image to detect a user's body landmarks (shoulders, waist, hips) and overlays digital clothing assets onto them — scaled, warped, and repositioned as the user moves — creating a realistic virtual try-on experience.

---

## Key Features

- **Real-time body pose estimation** — detects and tracks body landmarks frame-by-frame using MediaPipe
- **Clothing overlay** — digital clothing assets are scaled and warped to fit the user's detected body proportions
- **Movement tracking** — overlay adjusts dynamically as the user moves
- **Modular clothing assets** — swap in any clothing PNG from the assets folder

---

## Tech Stack

| Technology | Role |
|---|---|
| Python | Core language |
| OpenCV | Video stream handling and image manipulation |
| MediaPipe | Body and pose estimation |
| Custom env (mp_env) | Isolated environment for specialized libraries |

---

## Screenshot

<img width="887" height="520" alt="image" src="https://github.com/user-attachments/assets/a1325416-2e88-4069-8055-45601e4f4d1b" />
<img width="873" height="515" alt="image" src="https://github.com/user-attachments/assets/11c80e42-9dcc-41fa-8560-58329e840595" />


## Getting Started

### Prerequisites
- Python 3.x
- Virtual environment (venv or mp_env)

### Installation

```bash
# Clone the repo
git clone https://github.com/sampurnaprabhu3/Virtual-Trial-Room.git
cd Virtual-Trial-Room

# Install dependencies
pip install -r requirements.txt

# Run the app
python virtual_trial_room.py
```

---

## Repository Structure

```
Virtual-Trial-Room/
├── assets/
│   └── clothes/        # Digital clothing PNGs
├── mp_env/             # Custom virtual environment
├── virtual_trial_room.py   # Main application logic
└── .gitignore
```

---

## My Role

Built as part of my miniproject at Kolhapur Institute of Technology's College of Engineering,Kolhapur. Designed and developed the computer vision pipeline, clothing overlay logic, and pose estimation integration.




