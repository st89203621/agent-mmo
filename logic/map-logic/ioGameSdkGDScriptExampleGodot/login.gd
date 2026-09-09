extends Control

const Common = preload("res://gen/common.gd")

@onready var username_input = $Panel/VBoxContainer/UsernameContainer/UsernameInput
@onready var password_input = $Panel/VBoxContainer/PasswordContainer/PasswordInput
@onready var login_button = $Panel/VBoxContainer/ButtonContainer/LoginButton
@onready var register_button = $Panel/VBoxContainer/ButtonContainer/RegisterButton
@onready var status_label = $Panel/VBoxContainer/StatusLabel

# 网络连接状态
var is_connected = false

func _ready():
	# 连接按钮信号
	login_button.pressed.connect(_on_login_button_pressed)
	register_button.pressed.connect(_on_register_button_pressed)
	
	# 初始化网络
	_init_network()

func _init_network():
	# 初始化网络配置
	GameCode.init()
	Listener.listener_ioGame()
	
	var setting = IoGame.IoGameSetting
	setting.enable_dev_mode = true
	setting.set_language(IoGame.IoGameLanguage.Us)
	setting.listen_message_callback = MyListenMessageCallback.new()
	
	# 设置网络连接
	var socket = IoGame.WebSocketChannel.new()
	socket.url = "ws://localhost:10100/websocket"
	
	socket.on_open = func():
		is_connected = true
		status_label.text = "已连接到服务器"
		status_label.modulate = Color.GREEN
	
	socket.on_close = func():
		is_connected = false
		status_label.text = "与服务器断开连接"
		status_label.modulate = Color.RED
	
	socket.on_error = func():
		is_connected = false
		status_label.text = "连接服务器失败"
		status_label.modulate = Color.RED
	
	setting.net_channel = socket
	setting.start_net()
	
	status_label.text = "正在连接服务器..."
	status_label.modulate = Color.YELLOW

func _process(_delta):
	# 轮询网络
	IoGame.IoGameSetting.net_channel.poll()

func _on_login_button_pressed():
	var username = username_input.text.strip_edges()
	var password = password_input.text.strip_edges()
	
	if username.is_empty() or password.is_empty():
		status_label.text = "用户名和密码不能为空"
		status_label.modulate = Color.RED
		return
	
	if not is_connected:
		status_label.text = "未连接到服务器"
		status_label.modulate = Color.RED
		return
	
	status_label.text = "正在登录..."
	status_label.modulate = Color.YELLOW
	
	# 创建登录验证消息
	var login_verify = Common.LoginVerifyMessage.new()
	login_verify.set_username(username)
	login_verify.set_password(password)
	
	# 发送登录请求
	SdkAction.of_login_verify(login_verify, func(result: IoGame.ResponseResult):
		if result.success():
			var user_info = result.get_value(Common.UserMessage) as Common.UserMessage
			status_label.text = "登录成功，欢迎 " + user_info.get_name()
			status_label.modulate = Color.GREEN
			
			# 登录成功后延迟一秒进入主界面
			await get_tree().create_timer(1.0).timeout
			get_tree().change_scene_to_file("res://index.tscn")
		else:
			var error_code = result.get_response_status()
			var error_info = result.get_error_info()
			status_label.text = "登录失败: " + error_info
			status_label.modulate = Color.RED
	)

func _on_register_button_pressed():
	var username = username_input.text.strip_edges()
	var password = password_input.text.strip_edges()
	
	if username.is_empty() or password.is_empty():
		status_label.text = "用户名和密码不能为空"
		status_label.modulate = Color.RED
		return
	
	if not is_connected:
		status_label.text = "未连接到服务器"
		status_label.modulate = Color.RED
		return
	
	status_label.text = "正在注册..."
	status_label.modulate = Color.YELLOW
	
	# 创建注册请求消息
	var register_request = Common.RegisterRequestMessage.new()
	register_request.set_username(username)
	register_request.set_password(password)
	
	# 发送注册请求
	SdkAction.of_register(register_request, func(result: IoGame.ResponseResult):
		if result.success():
			var register_response = result.get_value(Common.RegisterResponseMessage) as Common.RegisterResponseMessage
			if register_response.get_success():
				status_label.text = "注册成功，请登录"
				status_label.modulate = Color.GREEN
			else:
				status_label.text = "注册失败"
				status_label.modulate = Color.RED
		else:
			var error_code = result.get_response_status()
			var error_info = result.get_error_info()
			status_label.text = "注册失败: " + error_info
			status_label.modulate = Color.RED
	)
