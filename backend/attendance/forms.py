from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from .models import Employee, Department


class EmployeeCreationForm(forms.Form):
    """Form tích hợp để tạo cả User và Employee"""
    
    # Thông tin tài khoản
    username = forms.CharField(
        max_length=150,
        label="Tên đăng nhập",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập tên đăng nhập'
        })
    )
    password = forms.CharField(
        label="Mật khẩu",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập mật khẩu'
        })
    )
    password_confirm = forms.CharField(
        label="Xác nhận mật khẩu",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập lại mật khẩu'
        })
    )
    first_name = forms.CharField(
        max_length=150,
        label="Tên",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập tên'
        })
    )
    last_name = forms.CharField(
        max_length=150,
        label="Họ",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập họ'
        })
    )
    email = forms.EmailField(
        required=False,
        label="Email",
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập email (tùy chọn)'
        })
    )
    
    # Thông tin nhân viên
    employee_id = forms.CharField(
        max_length=20,
        label="Mã nhân viên",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Ví dụ: NV001'
        })
    )
    gender = forms.ChoiceField(
        choices=Employee.GENDER_CHOICES,
        label="Giới tính",
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    date_of_birth = forms.DateField(
        required=False,
        label="Ngày sinh",
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    phone_number = forms.CharField(
        max_length=15,
        required=False,
        label="Số điện thoại",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập số điện thoại'
        })
    )
    address = forms.CharField(
        required=False,
        label="Địa chỉ",
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': 'Nhập địa chỉ'
        })
    )
    department = forms.ChoiceField(
        label="Phòng ban",
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    position = forms.CharField(
        max_length=100,
        label="Chức vụ",
        initial="Nhân viên",
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nhập chức vụ'
        })
    )
    join_date = forms.DateField(
        label="Ngày vào làm",
        widget=forms.DateInput(attrs={
            'class': 'form-control',
            'type': 'date'
        })
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Lấy danh sách phòng ban từ database
        departments = Department.objects.all().order_by('name')
        department_choices = [(dept.name, dept.name) for dept in departments]
        # Thêm option mặc định
        department_choices.insert(0, ('Chưa phân công', 'Chưa phân công'))
        self.fields['department'].choices = department_choices
    
    def clean_username(self):
        """Kiểm tra username đã tồn tại chưa"""
        username = self.cleaned_data.get('username')
        if User.objects.filter(username=username).exists():
            raise ValidationError('Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác.')
        return username
    
    def clean_employee_id(self):
        """Kiểm tra employee_id đã tồn tại chưa"""
        employee_id = self.cleaned_data.get('employee_id')
        if Employee.objects.filter(employee_id=employee_id).exists():
            raise ValidationError('Mã nhân viên này đã tồn tại. Vui lòng chọn mã khác.')
        return employee_id
    
    def clean(self):
        """Kiểm tra password và password_confirm khớp nhau"""
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')
        
        if password and password_confirm and password != password_confirm:
            raise ValidationError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.')
        
        return cleaned_data
    
    def save(self):
        """Tạo User và Employee"""
        # Tạo User
        user = User.objects.create_user(
            username=self.cleaned_data['username'],
            password=self.cleaned_data['password'],
            first_name=self.cleaned_data['first_name'],
            last_name=self.cleaned_data['last_name'],
            email=self.cleaned_data.get('email', '')
        )
        
        # Tạo Employee
        employee = Employee.objects.create(
            user=user,
            employee_id=self.cleaned_data['employee_id'],
            gender=self.cleaned_data['gender'],
            date_of_birth=self.cleaned_data.get('date_of_birth'),
            phone_number=self.cleaned_data.get('phone_number', ''),
            address=self.cleaned_data.get('address', ''),
            department=self.cleaned_data['department'],
            position=self.cleaned_data['position'],
            join_date=self.cleaned_data['join_date']
        )
        
        return employee
