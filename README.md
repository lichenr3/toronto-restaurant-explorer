# 🏥 DineSafe Explorer - Toronto Restaurant Health Inspection

## 快速启动

### 方法1：使用启动脚本（推荐）
1. 双击 `start_server.bat`（Windows命令行）或 `start_server.ps1`（PowerShell）
2. 脚本会自动启动服务器并打开浏览器

### 方法2：手动启动
1. 打开命令行/PowerShell
2. 进入项目目录：`cd "d:\2025Fall\CSC316\A4_test"`
3. 启动服务器：`python -m http.server 8000`
4. 在浏览器打开：`http://localhost:8000`

### 方法3：使用当前服务器
- 访问：`http://localhost:8001`
- 调试页面：`http://localhost:8001/debug.html`

## 故障排除

### CORS错误
- **问题**：直接双击HTML文件会出现CORS错误
- **解决**：必须通过HTTP服务器访问，不能直接打开文件

### 数据加载失败
- **检查**：访问 `debug.html` 查看详细状态
- **确认**：所有数据文件在 `data/` 目录中

### JavaScript错误
- **检查**：打开浏览器开发者工具（F12）查看Console
- **确认**：所有JS文件在 `js/` 目录中

## 项目结构
```
A4_test/
├── index.html          # 主页面
├── debug.html          # 调试页面
├── start_server.bat    # Windows启动脚本
├── start_server.ps1    # PowerShell启动脚本
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── dataLoader.js   # 数据加载
│   ├── mapState.js     # 状态管理
│   ├── tooltip.js      # 提示框
│   ├── mainMap.js      # 主地图
│   ├── miniMap.js      # 小地图
│   ├── map.js          # 地图初始化
│   ├── charts.js       # 图表
│   └── script.js       # 主脚本
└── data/
    ├── Neighbourhoods.geojson  # 社区边界
    ├── Dinesafe.json          # 餐厅健康数据
    └── yelp_data.csv          # Yelp评分数据
```

## 功能特点
- ✅ 交互式地图浏览
- ✅ 餐厅点悬停信息
- ✅ 社区选择和统计
- ✅ 动态筛选器
- ✅ 缩放时显示小地图
- ✅ 统计图表显示
- ✅ 防闪烁优化

## 如果仍有问题
1. 确保Python已安装
2. 确保在正确的目录启动服务器
3. 检查端口8000/8001是否被占用
4. 访问debug.html查看详细状态
