import os
from PIL import Image
from tqdm import tqdm
from PIL import Image
import numpy as np
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler
import albumentations as A
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator


def clean_and_standardize_images(src_base, tgt_base, labels, img_size=(224, 224)):
    """
    Cleans and resizes images to a standard format and saves them as .png.
    Args:
        src_base (str): Path to source dataset
        tgt_base (str): Path to target (cleaned) dataset
        labels (list): List of class folder names
        img_size (tuple): Target size (width, height)
    Returns:
        None
    """
    os.makedirs(tgt_base, exist_ok=True)
    for label in labels:
        src_dir = os.path.join(src_base, label)
        tgt_dir = os.path.join(tgt_base, label)
        os.makedirs(tgt_dir, exist_ok=True)
        for file in tqdm(os.listdir(src_dir), desc=f"[{label}]"):
            if not file.lower().endswith(('.jpg', '.bmp')):
                continue
            try:
                img = Image.open(os.path.join(src_dir, file)).convert("RGB")
                img = img.resize(img_size)
                save_name = os.path.splitext(file)[0] + ".png"
                img.save(os.path.join(tgt_dir, save_name))
            except Exception as e:
                print(f"[Skip] {file}: {e}")




def load_image_flatten(img_path, size=(224, 224)):
    img = Image.open(img_path).convert('L').resize(size)
    return np.array(img).flatten()

def load_dataset_images(train_dir, img_ext=".png"):
    image_paths, labels = [], []
    for blood_group in sorted(os.listdir(train_dir)):
        label_dir = os.path.join(train_dir, blood_group)
        if os.path.isdir(label_dir):
            for img_file in os.listdir(label_dir):
                if img_file.lower().endswith(img_ext):
                    image_paths.append(os.path.join(label_dir, img_file))
                    labels.append(blood_group)
    return image_paths, labels
def apply_smote(X, y, random_state=42):
    return SMOTE(random_state=random_state).fit_resample(X, y)
def apply_random_under_sampling(X, y, random_state=42):
    return RandomUnderSampler(random_state=random_state).fit_resample(X, y)

def save_resampled_images(X_reshaped, y_resampled, label_encoder, save_dir, image_shape=(224, 224)):
    os.makedirs(save_dir, exist_ok=True)
    for label in label_encoder.classes_:
        os.makedirs(os.path.join(save_dir, label), exist_ok=True)
    for idx, (img_array, label_idx) in enumerate(zip(X_reshaped, y_resampled)):
        label = label_encoder.inverse_transform([label_idx])[0]
        img = Image.fromarray(img_array.astype(np.uint8))
        save_path = os.path.join(save_dir, label, f"{idx}.png")
        img.save(save_path)



def get_albumentations_transform():
    return A.Compose([
        A.RandomRotate90(),
        A.HorizontalFlip(),
        A.VerticalFlip(),
        A.RandomBrightnessContrast(brightness_limit=0.1, contrast_limit=0.1),
        A.Affine(translate_percent={"x": 0.05, "y": 0.05}, scale=(0.9, 1.1), rotate=15, p=1),
        A.GaussNoise(),
        A.Sharpen(alpha=(0.1, 0.3)),  # <-- sharpening here
        A.RandomGamma(),
        A.Normalize()
    ])

def get_training_data(validation_split=0.2):
    return ImageDataGenerator(
        rescale=1./255,
        validation_split=validation_split
    )

def get_tf_augmentor(validation_split=0.2):
    return ImageDataGenerator(
        rescale=1./255,
        rotation_range=10,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.1,
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=validation_split
    )

def get_tf_augmentor2(validation_split=0.2):
    return ImageDataGenerator(
        rescale=1./255,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.12,
        horizontal_flip=True,
        fill_mode='nearest',
        validation_split=validation_split
    )