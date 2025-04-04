# 部署指南

要将项目部署到GitHub，并启用GitHub Pages，请按照以下步骤操作：

## 1. 推送代码到GitHub

由于需要GitHub身份验证，请在您的环境中执行以下命令：

```bash
# 确保您已经执行了前面的git init, add和commit操作
# 如果还没有执行，请先初始化git仓库并提交所有文件

# 添加远程仓库（如果已经执行过则跳过）
git remote add origin https://github.com/ethanzfy/flux-image-generator.git

# 设置默认分支为main（如果已经执行过则跳过）
git branch -M main

# 推送到GitHub
git push -u origin main
```

执行上述命令时，您需要提供GitHub的用户名和密码（或个人访问令牌）。

## 2. 启用GitHub Pages

1. 在GitHub上访问仓库：https://github.com/ethanzfy/flux-image-generator
2. 点击仓库页面上的"Settings"（设置）选项卡
3. 在左侧菜单中找到并点击"Pages"
4. 在"Source"部分，选择"Deploy from a branch"
5. 在"Branch"下拉菜单中选择"main"，文件夹选择"/ (root)"
6. 点击"Save"按钮
7. 等待几分钟，GitHub Pages将自动部署您的网站
8. 部署完成后，您可以通过以下地址访问：https://ethanzfy.github.io/flux-image-generator/

## 3. 设置GitHub Actions（可选）

项目已包含GitHub Actions工作流配置文件，位于`.github/workflows/github-pages.yml`。如果您已启用GitHub Actions，则每次推送到main分支时，网站将自动部署。

要启用GitHub Actions：

1. 在GitHub仓库中点击"Actions"选项卡
2. 点击"I understand my workflows, go ahead and enable them"
3. 选择并启用"Deploy to GitHub Pages"工作流

## 注意事项

- 首次部署可能需要几分钟时间
- 如果遇到问题，请检查GitHub仓库的Actions选项卡中的构建日志
- 确保API密钥妥善保管，不要泄露给他人 