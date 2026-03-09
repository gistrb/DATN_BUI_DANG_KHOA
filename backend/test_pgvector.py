import os
import sys

sys.path.append(r'c:\Users\gistr\PycharmProjects\DOANTN\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from attendance.views.face_views import find_matching_employee
from attendance.models import EmployeeFaceEmbedding

count = EmployeeFaceEmbedding.objects.count()
print(f"Total vector embeddings in DB: {count}")

if count > 0:
    emb = EmployeeFaceEmbedding.objects.first()
    print(f"Testing with embedding size: {len(emb.embedding)}")
    match, score = find_matching_employee(emb.embedding)
    print(f"Match result: {match}")
    print(f"Score: {score}")
else:
    print("No data available to test.")
