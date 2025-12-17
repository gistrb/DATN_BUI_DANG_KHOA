from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from attendance.models import Employee, Department, AttendanceRecord
from datetime import date


class Command(BaseCommand):
    help = 'Reset và tạo dữ liệu mẫu với Department được liên kết'

    def handle(self, *args, **options):
        self.stdout.write("=" * 50)
        self.stdout.write(self.style.SUCCESS("RESETTING DATA - Xóa dữ liệu cũ và tạo dữ liệu mẫu mới"))
        self.stdout.write("=" * 50)

        # Step 1: Delete old data
        self.stdout.write("\n1. Xóa dữ liệu cũ...")
        AttendanceRecord.objects.all().delete()
        self.stdout.write(f"   - Đã xóa attendance records")

        Employee.objects.all().delete()
        self.stdout.write(f"   - Đã xóa tất cả employees")

        Department.objects.all().delete()
        self.stdout.write(f"   - Đã xóa tất cả departments")

        User.objects.exclude(username='admin').delete()
        self.stdout.write(f"   - Đã xóa users (giữ lại admin)")

        # Step 2: Create Departments
        self.stdout.write("\n2. Tạo phòng ban...")
        departments_data = [
            {"name": "Phòng Kỹ Thuật", "description": "Phòng phát triển phần mềm và công nghệ"},
            {"name": "Phòng Kinh Doanh", "description": "Phòng bán hàng và chăm sóc khách hàng"},
            {"name": "Phòng Nhân Sự", "description": "Phòng quản lý nhân sự và tuyển dụng"},
            {"name": "Phòng Kế Toán", "description": "Phòng tài chính và kế toán"},
            {"name": "Phòng Marketing", "description": "Phòng marketing và truyền thông"},
        ]

        departments = {}
        for dept_data in departments_data:
            dept = Department.objects.create(**dept_data)
            departments[dept.name] = dept
            self.stdout.write(self.style.SUCCESS(f"   ✓ Tạo phòng ban: {dept.name}"))

        # Step 3: Create sample employees
        self.stdout.write("\n3. Tạo nhân viên mẫu...")
        employees_data = [
            # Phòng Kỹ Thuật
            {"username": "nguyenvana", "first_name": "Văn A", "last_name": "Nguyễn", "email": "vana@company.com",
             "employee_id": "NV001", "department": "Phòng Kỹ Thuật", "position": "Trưởng phòng", "work_status": "WORKING"},
            {"username": "tranthib", "first_name": "Thị B", "last_name": "Trần", "email": "thib@company.com",
             "employee_id": "NV002", "department": "Phòng Kỹ Thuật", "position": "Senior Developer", "work_status": "WORKING"},
            {"username": "levanc", "first_name": "Văn C", "last_name": "Lê", "email": "vanc@company.com",
             "employee_id": "NV003", "department": "Phòng Kỹ Thuật", "position": "Developer", "work_status": "WORKING"},
            
            # Phòng Kinh Doanh
            {"username": "phamthid", "first_name": "Thị D", "last_name": "Phạm", "email": "thid@company.com",
             "employee_id": "NV004", "department": "Phòng Kinh Doanh", "position": "Trưởng phòng", "work_status": "WORKING"},
            {"username": "hoangvane", "first_name": "Văn E", "last_name": "Hoàng", "email": "vane@company.com",
             "employee_id": "NV005", "department": "Phòng Kinh Doanh", "position": "Sales Manager", "work_status": "WORKING"},
            {"username": "vuthif", "first_name": "Thị F", "last_name": "Vũ", "email": "thif@company.com",
             "employee_id": "NV006", "department": "Phòng Kinh Doanh", "position": "Sales", "work_status": "ON_LEAVE"},
            
            # Phòng Nhân Sự
            {"username": "dovang", "first_name": "Văn G", "last_name": "Đỗ", "email": "vang@company.com",
             "employee_id": "NV007", "department": "Phòng Nhân Sự", "position": "Trưởng phòng", "work_status": "WORKING"},
            {"username": "ngothih", "first_name": "Thị H", "last_name": "Ngô", "email": "thih@company.com",
             "employee_id": "NV008", "department": "Phòng Nhân Sự", "position": "HR Specialist", "work_status": "WORKING"},
            
            # Phòng Kế Toán
            {"username": "buivani", "first_name": "Văn I", "last_name": "Bùi", "email": "vani@company.com",
             "employee_id": "NV009", "department": "Phòng Kế Toán", "position": "Trưởng phòng", "work_status": "WORKING"},
            {"username": "duongthik", "first_name": "Thị K", "last_name": "Dương", "email": "thik@company.com",
             "employee_id": "NV010", "department": "Phòng Kế Toán", "position": "Kế toán viên", "work_status": "WORKING"},
            
            # Phòng Marketing
            {"username": "lyvanl", "first_name": "Văn L", "last_name": "Lý", "email": "vanl@company.com",
             "employee_id": "NV011", "department": "Phòng Marketing", "position": "Trưởng phòng", "work_status": "WORKING"},
            {"username": "dinhthim", "first_name": "Thị M", "last_name": "Đinh", "email": "thim@company.com",
             "employee_id": "NV012", "department": "Phòng Marketing", "position": "Content Creator", "work_status": "WORKING"},
        ]

        for emp_data in employees_data:
            # Create user
            user = User.objects.create_user(
                username=emp_data["username"],
                first_name=emp_data["first_name"],
                last_name=emp_data["last_name"],
                email=emp_data["email"],
                password="123456"
            )
            
            # Create employee
            employee = Employee.objects.create(
                user=user,
                employee_id=emp_data["employee_id"],
                department=emp_data["department"],
                position=emp_data["position"],
                work_status=emp_data["work_status"],
                join_date=date(2024, 1, 1),
                current_status='NOT_IN'
            )
            
            self.stdout.write(self.style.SUCCESS(
                f"   ✓ Tạo nhân viên: {employee.user.get_full_name()} ({employee.employee_id}) - {employee.department}"
            ))

        # Summary
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("HOÀN TẤT!"))
        self.stdout.write("=" * 50)
        self.stdout.write(f"Tổng số phòng ban: {Department.objects.count()}")
        self.stdout.write(f"Tổng số nhân viên: {Employee.objects.count()}")
        self.stdout.write("\nPhân bố nhân viên theo phòng ban:")
        for dept in Department.objects.all():
            count = Employee.objects.filter(department=dept.name).count()
            self.stdout.write(f"  - {dept.name}: {count} nhân viên")

        self.stdout.write(self.style.SUCCESS("\n✓ Dữ liệu đã được reset và tạo mới thành công!"))
        self.stdout.write(self.style.WARNING("✓ Mật khẩu mặc định cho tất cả nhân viên: 123456"))
