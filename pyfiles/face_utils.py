from functools import wraps
import sys
import io
from deepface import DeepFace
import os

# Set TensorFlow logging level to suppress warnings and info messages
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Wrapper to capture print output from DeepFace
def capture_output(func):
    """Wrapper to capture print output."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        old_stdout = sys.stdout  # Save the current stdout
        new_stdout = io.StringIO()  # Create a new StringIO stream to capture prints
        sys.stdout = new_stdout  # Redirect stdout to the new stream
        try:
            return func(*args, **kwargs)  # Call the original function
        finally:
            sys.stdout = old_stdout  # Restore the original stdout
    return wrapper

# To verify faces (wrapped with capture_output to suppress DeepFace logs)
@capture_output
def match_faces(image_path, folder):
    try:
        result = DeepFace.find(img_path=image_path, db_path=folder, model_name='ArcFace')
        
        if result and isinstance(result, list) and len(result) > 0:
            # Get the first matched image path directly
            full_image_path = result[0]['identity'].iloc[0]
            
            image_name_with_extension = os.path.basename(full_image_path)  # Get just the filename with extension
            image_name = os.path.splitext(image_name_with_extension)[0]  # Remove the file extension

            return image_name
        else:
            return False
    except Exception as e:
        print(f"An error occurred: {e}")
        return False

# To detect face from images (wrapped with capture_output to suppress DeepFace logs)
@capture_output
def is_face_detected(image_path):
    try:
        extracted_faces = DeepFace.extract_faces(image_path, enforce_detection=True)

        if len(extracted_faces) > 0:
            return True
        else:
            return False
    except Exception as e:
        print(f"An error occurred: {e}")
        return False
