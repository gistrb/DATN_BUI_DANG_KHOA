"""Quick Accuracy Test with 2 employees"""
import os
import sys

# Add parent directory to path to find config and attendance modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from attendance.face_recognition.face_processor import get_face_processor
from attendance.models import Employee

print("\n" + "="*60)
print("ACCURACY TEST")
print("="*60)

processor = get_face_processor()
employees = Employee.objects.filter(face_embeddings__isnull=False)

print(f"\nEmployees with face data: {employees.count()}\n")

results = {'tp': 0, 'fp': 0, 'fn': 0}

for emp in employees:
    embeddings = emp.get_face_embeddings()
    if not embeddings or len(embeddings) < 2:
        print(f"{emp.employee_id}: Not enough embeddings ({len(embeddings)})")
        continue
    
    # Test with last embedding
    test_emb = embeddings[-1]
    result = processor.verify_face(test_emb)
    
    if result:
        if result['employee_id'] == emp.employee_id:
            results['tp'] += 1
            status = "TRUE POSITIVE"
            print(f"{emp.employee_id} ({emp.get_full_name()}): {status} - Similarity: {result['similarity_score']:.3f}")
        else:
            results['fp'] += 1
            status = "FALSE POSITIVE"
            print(f"{emp.employee_id}: {status} - Matched {result['employee_id']} instead!")
    else:
        results['fn'] += 1
        print(f"{emp.employee_id}: FALSE NEGATIVE - Not recognized")

# Summary
total = results['tp'] + results['fp'] + results['fn']
if total > 0:
    accuracy = results['tp'] / total * 100
    print(f"\n{'='*60}")
    print("RESULTS")
    print(f"{'='*60}")
    print(f"True Positive:  {results['tp']}")
    print(f"False Positive: {results['fp']}")
    print(f"False Negative: {results['fn']}")
    print(f"Accuracy: {accuracy:.1f}%")
    
    if accuracy == 100:
        print("\n EXCELLENT! All faces correctly recognized!")
    elif accuracy >= 80:
        print("\n GOOD! Most faces recognized correctly")
    else:
        print("\n NEEDS IMPROVEMENT")

print("\n" + "="*60)
