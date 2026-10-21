
from pathlib import Path
from threading import Lock

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(
    title="VisionFitAI API",
    description="API for the VisionFitAI virtual fitting room",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
SUPPORTED_FORMATS = {".png", ".jpg", ".jpeg", ".webp"}

if ASSETS_DIR.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=str(ASSETS_DIR)),
        name="assets",
    )

camera = None
pose = None
tryon_active = False
selected_index = 0
camera_lock = Lock()


def get_clothing_files():
    """Find supported clothing images in the assets directory."""
    if not ASSETS_DIR.is_dir():
        return []

    return sorted(
        [
            path
            for path in ASSETS_DIR.rglob("*")
            if path.is_file()
            and path.suffix.lower() in SUPPORTED_FORMATS
        ],
        key=lambda path: path.as_posix().lower(),
    )


def get_clothes_response():
    clothes = []

    for image_path in get_clothing_files():
        clothes.append({
            "name": image_path.stem.replace("_", " ").title(),
            "image": (
                "/assets/"
                + image_path.relative_to(ASSETS_DIR).as_posix()
            ),
        })

    return {
        "success": True,
        "count": len(clothes),
        "items": clothes,
    }


@app.get("/")
def home():
    return {
        "success": True,
        "message": "VisionFitAI API is running!",
    }


@app.get("/api/health")
def health():
    return {
        "success": True,
        "service": "VisionFitAI",
        "status": "online",
    }


@app.get("/api/clothes")
def get_clothes():
    return get_clothes_response()


class TryOnRequest(BaseModel):
    index: int = 0


@app.post("/api/tryon/start")
def start_tryon(request: TryOnRequest):
    global camera, pose, tryon_active, selected_index

    clothes = get_clothing_files()

    if not clothes:
        raise HTTPException(
            status_code=400,
            detail="No clothing images found in the assets directory.",
        )

    if request.index < 0 or request.index >= len(clothes):
        raise HTTPException(
            status_code=400,
            detail="Invalid clothing selection.",
        )

    with camera_lock:
        selected_index = request.index

        if camera is None or not camera.isOpened():
            camera = cv2.VideoCapture(0)

        if not camera.isOpened():
            camera.release()
            camera = None
            raise HTTPException(
                status_code=503,
                detail=(
                    "Could not access the webcam. Check camera permissions "
                    "and close other apps using the camera."
                ),
            )

        if pose is None:
            pose = mp.solutions.pose.Pose(
                min_detection_confidence=0.6,
                min_tracking_confidence=0.6,
                model_complexity=1,
            )

        tryon_active = True

    return {
        "success": True,
        "message": "Virtual try-on started.",
    }


@app.post("/api/tryon/stop")
def stop_tryon():
    global camera, pose, tryon_active

    with camera_lock:
        tryon_active = False

        if camera is not None:
            camera.release()
            camera = None

        if pose is not None:
            pose.close()
            pose = None

    return {
        "success": True,
        "message": "Virtual try-on stopped.",
    }


def overlay_clothing(frame, results, clothing_path):
    """Place a clothing image over the detected upper-body region."""
    if not results.pose_landmarks:
        return frame

    cloth_img = cv2.imread(
        str(clothing_path),
        cv2.IMREAD_UNCHANGED,
    )

    if cloth_img is None:
        return frame

    h, w = frame.shape[:2]
    points = results.pose_landmarks.landmark
    landmark = mp.solutions.pose.PoseLandmark

    left_shoulder = points[landmark.LEFT_SHOULDER]
    right_shoulder = points[landmark.RIGHT_SHOULDER]
    left_hip = points[landmark.LEFT_HIP]
    right_hip = points[landmark.RIGHT_HIP]

    # Avoid overlaying clothes when the upper-body landmarks are unreliable.
    required_points = [
        left_shoulder,
        right_shoulder,
        left_hip,
        right_hip,
    ]

    if any(point.visibility < 0.35 for point in required_points):
        return frame

    shoulder_width = (
        abs(left_shoulder.x - right_shoulder.x) * w
    )
    shoulder_y = (
        (left_shoulder.y + right_shoulder.y) * h / 2
    )
    hip_y = (
        (left_hip.y + right_hip.y) * h / 2
    )

    center_x = int(
        (left_shoulder.x + right_shoulder.x) * w / 2
    )
    center_y = int((shoulder_y + hip_y) / 2)

    cloth_width = max(100, int(shoulder_width * 1.8))
    cloth_height = max(130, int(abs(hip_y - shoulder_y) * 1.5))

    if cloth_img.ndim == 2:
        cloth_img = cv2.cvtColor(
            cloth_img,
            cv2.COLOR_GRAY2BGRA,
        )
    elif cloth_img.shape[2] == 3:
        # No transparency is available in this image.
        # This fallback will display a solid rectangular garment.
        cloth_img = cv2.cvtColor(
            cloth_img,
            cv2.COLOR_BGR2BGRA,
        )

    cloth = cv2.resize(
        cloth_img,
        (cloth_width, cloth_height),
        interpolation=cv2.INTER_AREA,
    )

    x1 = center_x - cloth_width // 2
    y1 = int(shoulder_y)
    x2 = x1 + cloth_width
    y2 = y1 + cloth_height

    frame_x1 = max(0, x1)
    frame_y1 = max(0, y1)
    frame_x2 = min(w, x2)
    frame_y2 = min(h, y2)

    if frame_x1 >= frame_x2 or frame_y1 >= frame_y2:
        return frame

    cloth_x1 = frame_x1 - x1
    cloth_y1 = frame_y1 - y1
    cloth_x2 = cloth_x1 + frame_x2 - frame_x1
    cloth_y2 = cloth_y1 + frame_y2 - frame_y1

    garment = cloth[
        cloth_y1:cloth_y2,
        cloth_x1:cloth_x2,
    ]

    roi = frame[
        frame_y1:frame_y2,
        frame_x1:frame_x2,
    ]

    alpha = (
        garment[:, :, 3:4].astype(np.float32) / 255.0
    )
    garment_rgb = garment[:, :, :3].astype(np.float32)

    blended = (
        alpha * garment_rgb
        + (1.0 - alpha) * roi.astype(np.float32)
    )

    frame[frame_y1:frame_y2, frame_x1:frame_x2] = (
        blended.astype(np.uint8)
    )

    return frame


def generate_frames():
    global camera, pose, tryon_active, selected_index

    while True:
        with camera_lock:
            if (
                not tryon_active
                or camera is None
                or pose is None
            ):
                break

            success, frame = camera.read()
            current_pose = pose

            clothes = get_clothing_files()
            clothing_path = (
                clothes[selected_index]
                if selected_index < len(clothes)
                else None
            )

        if not success:
            break

        frame = cv2.flip(frame, 1)

        if clothing_path is not None:
            rgb_frame = cv2.cvtColor(
                frame,
                cv2.COLOR_BGR2RGB,
            )
            results = current_pose.process(rgb_frame)

            frame = overlay_clothing(
                frame,
                results,
                clothing_path,
            )

        success, encoded = cv2.imencode(
            ".jpg",
            frame,
            [cv2.IMWRITE_JPEG_QUALITY, 85],
        )

        if not success:
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + encoded.tobytes()
            + b"\r\n"
        )


@app.get("/api/tryon/stream")
def tryon_stream():
    if not tryon_active:
        raise HTTPException(
            status_code=409,
            detail="Start the virtual try-on first.",
        )

    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.on_event("shutdown")
def shutdown_camera():
    global camera, pose, tryon_active

    with camera_lock:
        tryon_active = False

        if camera is not None:
            camera.release()
            camera = None

        if pose is not None:
            pose.close()
            pose = None
