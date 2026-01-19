"""
Performance Testing Script for Face Recognition System
Test face detection, embedding extraction, and verification speed
"""
import os
import sys
import django
import time
import cv2
import numpy as np

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from attendance.face_recognition.face_processor import get_face_processor
from attendance.models import Employee

def generate_test_image(size=(640, 480)):
    """Generate a random test image"""
    return np.random.randint(0, 255, (*size, 3), dtype=np.uint8)

def test_face_detection(processor, iterations=10):
    """Test face detection speed"""
    print("\n" + "="*60)
    print("TEST 1: FACE DETECTION SPEED")
    print("="*60)
    
    test_image = generate_test_image()
    times = []
    
    for i in range(iterations):
        start = time.time()
        faces = processor.app.get(test_image)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  Iteration {i+1}: {elapsed*1000:.2f}ms")
    
    avg_time = np.mean(times) * 1000
    min_time = np.min(times) * 1000
    max_time = np.max(times) * 1000
    
    print(f"\n  Average: {avg_time:.2f}ms")
    print(f"  Min: {min_time:.2f}ms")
    print(f"  Max: {max_time:.2f}ms")
    print(f"  det_size: {processor.app.det_size}")
    
    return avg_time

def test_embedding_extraction(processor, iterations=10):
    """Test embedding extraction speed"""
    print("\n" + "="*60)
    print("TEST 2: EMBEDDING EXTRACTION SPEED")
    print("="*60)
    
    test_image = generate_test_image()
    times = []
    
    for i in range(iterations):
        start = time.time()
        embedding = processor.extract_embedding(test_image)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  Iteration {i+1}: {elapsed*1000:.2f}ms")
    
    avg_time = np.mean(times) * 1000
    min_time = np.min(times) * 1000
    max_time = np.max(times) * 1000
    
    print(f"\n  Average: {avg_time:.2f}ms")
    print(f"  Min: {min_time:.2f}ms")
    print(f"  Max: {max_time:.2f}ms")
    
    return avg_time

def test_face_matching(processor):
    """Test face matching speed with real database"""
    print("\n" + "="*60)
    print("TEST 3: FACE MATCHING SPEED (Real DB)")
    print("="*60)
    
    # Get employees with face data
    employees = Employee.objects.filter(face_embeddings__isnull=False)
    employee_count = employees.count()
    
    print(f"  Number of employees in DB: {employee_count}")
    
    if employee_count == 0:
        print("  ⚠️ No employees with face data found. Skipping test.")
        return None
    
    test_image = generate_test_image()
    
    # Test with different det_sizes
    times = []
    for i in range(5):
        start = time.time()
        result = processor.verify_face(test_image)
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"  Iteration {i+1}: {elapsed*1000:.2f}ms")
    
    avg_time = np.mean(times) * 1000
    print(f"\n  Average matching time: {avg_time:.2f}ms")
    print(f"  Threshold: {processor.similarity_threshold}")
    
    return avg_time

def test_memory_usage():
    """Test memory usage"""
    print("\n" + "="*60)
    print("TEST 4: MEMORY USAGE")
    print("="*60)
    
    try:
        import psutil
        process = psutil.Process()
        memory_info = process.memory_info()
        
        print(f"  RSS Memory: {memory_info.rss / 1024 / 1024:.2f} MB")
        print(f"  VMS Memory: {memory_info.vms / 1024 / 1024:.2f} MB")
    except ImportError:
        print("  ⚠️ psutil not installed. Run: pip install psutil")

def main():
    print("\n" + "🔥"*30)
    print("FACE RECOGNITION PERFORMANCE TEST")
    print("🔥"*30)
    
    # Initialize processor
    print("\n⏳ Initializing FaceProcessor...")
    start_init = time.time()
    processor = get_face_processor()
    init_time = time.time() - start_init
    print(f"✅ Initialization time: {init_time*1000:.2f}ms")
    print(f"   Model: buffalo_s")
    print(f"   det_size: {processor.app.det_size}")
    print(f"   Similarity threshold: {processor.similarity_threshold}")
    
    # Run tests
    detection_time = test_face_detection(processor)
    embedding_time = test_embedding_extraction(processor)
    matching_time = test_face_matching(processor)
    test_memory_usage()
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"  Face Detection: {detection_time:.2f}ms")
    print(f"  Embedding Extraction: {embedding_time:.2f}ms")
    if matching_time:
        print(f"  Face Matching: {matching_time:.2f}ms")
        print(f"  Total (Detection + Embedding + Matching): {detection_time + embedding_time + matching_time:.2f}ms")
    
    # Performance recommendations
    print("\n" + "="*60)
    print("RECOMMENDATIONS")
    print("="*60)
    
    total_time = detection_time + embedding_time
    if matching_time:
        total_time += matching_time
    
    if total_time < 1000:
        print("  ✅ EXCELLENT: System response < 1s")
    elif total_time < 2000:
        print("  ✅ GOOD: System response < 2s")
    elif total_time < 3000:
        print("  ⚠️ ACCEPTABLE: System response 2-3s")
    else:
        print("  ❌ SLOW: System response > 3s")
        print("  💡 Consider:")
        print("     - Reduce det_size to 480x480")
        print("     - Use buffalo_s instead of buffalo_l")
        print("     - Limit number of employees with face data")
    
    print("\n✨ Performance test completed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
