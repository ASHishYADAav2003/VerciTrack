import os
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout, RandomFlip, RandomRotation, RandomZoom, Rescaling
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import classification_report

# Paths
DATASET_DIR = "../dataset/train"
MODELS_DIR = "./models"
MODEL_PATH = os.path.join(MODELS_DIR, "coffee_classifier.h5")
PLOT_PATH = os.path.join(MODELS_DIR, "training_history.png")

# Ensure models directory exists
os.makedirs(MODELS_DIR, exist_ok=True)

# Hyperparameters
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 5
PATIENCE = 3

# Hardcode class names to maintain consistent ordering between training and inference
CLASS_NAMES = ['Dark', 'Green', 'Light', 'Medium']

def main():
    """
    Main function to train the MobileNetV2 coffee bean classifier.
    """
    if not os.path.exists(DATASET_DIR):
        print(f"Error: Dataset directory '{DATASET_DIR}' not found. Please create it and add the images.")
        return

    # Load datasets
    print("Loading datasets...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
        class_names=CLASS_NAMES
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        DATASET_DIR,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
        class_names=CLASS_NAMES
    )

    print(f"Classes used: {CLASS_NAMES}")

    # Data augmentation block
    data_augmentation = Sequential([
        RandomFlip("horizontal_and_vertical"),
        RandomRotation(0.2),
        RandomZoom(0.2),
    ], name="data_augmentation")

    # MobileNetV2 base (frozen)
    print("Building model...")
    base_model = MobileNetV2(
        input_shape=IMG_SIZE + (3,),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False  # Freeze the base

    # Build the complete model
    inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
    # 1. Data Augmentation
    x = data_augmentation(inputs)
    # 2. Preprocessing (MobileNetV2 expects [-1, 1] input range)
    x = Rescaling(1./127.5, offset=-1)(x)
    # 3. Base model
    x = base_model(x, training=False)
    # 4. Classification head
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.3)(x)
    outputs = Dense(4, activation='softmax')(x)

    model = Model(inputs, outputs)

    # Compile the model
    model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    model.summary()

    # Callbacks
    early_stop = EarlyStopping(
        monitor='val_loss',
        patience=PATIENCE,
        restore_best_weights=True,
        verbose=1
    )

    # Train
    print("Training started...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=[early_stop]
    )

    # Save model
    print(f"Saving model to {MODEL_PATH}...")
    model.save(MODEL_PATH)

    # Plot training history
    plot_training_history(history)

    # Generate classification report
    evaluate_model(model, val_ds)

def plot_training_history(history):
    """
    Plots training and validation accuracy and loss over epochs.
    """
    acc = history.history['accuracy']
    val_acc = history.history['val_accuracy']
    loss = history.history['loss']
    val_loss = history.history['val_loss']

    epochs_range = range(len(acc))

    plt.figure(figsize=(12, 4))
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, acc, label='Training Accuracy')
    plt.plot(epochs_range, val_acc, label='Validation Accuracy')
    plt.legend(loc='lower right')
    plt.title('Training and Validation Accuracy')

    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, loss, label='Training Loss')
    plt.plot(epochs_range, val_loss, label='Validation Loss')
    plt.legend(loc='upper right')
    plt.title('Training and Validation Loss')
    
    plt.savefig(PLOT_PATH)
    print(f"Saved training history plot to {PLOT_PATH}")

def evaluate_model(model, val_ds):
    """
    Evaluates the model on the validation dataset and prints a classification report.
    """
    print("Evaluating model...")
    y_true = []
    y_pred = []

    for images, labels in val_ds:
        preds = model.predict(images, verbose=0)
        y_pred.extend(np.argmax(preds, axis=1))
        y_true.extend(np.argmax(labels.numpy(), axis=1))

    report = classification_report(y_true, y_pred, target_names=CLASS_NAMES)
    print("\nClassification Report:\n")
    print(report)

if __name__ == '__main__':
    main()
