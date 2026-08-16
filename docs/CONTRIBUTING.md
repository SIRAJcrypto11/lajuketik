# 贡献指南 · Contributing

欢迎参与 TypeFlow 的开发！无论是提交 Issue、修复 Bug、新增功能还是完善文档，都对你的贡献表示感谢。🙌

## 本地开发

```bash
# 克隆仓库
git clone https://github.com/gitstq/TypeFlow.git
cd TypeFlow

# 启动本地静态服务器
npm start
# 或使用任意静态服务器，例如：
# python3 -m http.server 5173
```

项目为纯前端静态应用，**无需构建**，直接打开 `index.html` 或启动静态服务器即可运行。

## 提交规范

请遵循 [Angular Commit Message Conventions](https://www.conventionalcommits.org/zh-hans/)：

- `feat:` 新增功能
- `fix:` 修复问题
- `docs:` 文档更新
- `refactor:` 代码重构
- `perf:` 性能优化
- `style:` 样式调整
- `test:` 测试相关
- `chore:` 构建/工具配置

示例：`feat: 新增自定义词库导入功能`

## 分支流程

1. 从 `main` 拉取最新代码并创建功能分支：`git checkout -b feat/your-feature`
2. 完成开发并本地自测
3. 提交清晰的 commit，推送到你的分支
4. 发起 Pull Request，描述你的改动与动机

## Issue 反馈

- 描述清楚的复现步骤、期望行为与实际行为
- 注明浏览器与版本、操作系统
- 若能附带截图或录屏最佳

## 代码风格

- 保持现有代码风格（同目录下风格一致）
- 注释清晰、结构合理、无冗余代码
- 不引入非必要的第三方依赖（本项目目标为「零依赖、可离线运行」）

## 协议

本项目使用 MIT 协议，详见 [LICENSE](./LICENSE)。