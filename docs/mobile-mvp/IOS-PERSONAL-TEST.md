# iOS Personal Team 测试配置

此配置生成未签名 IPA，需使用有效的签名及描述文件安装。构建成功不代表真机验收通过。

## 配置差异

设置 `ASTERFIN_IOS_PERSONAL_TEAM=1`、`EXPO_TV=0` 后，移除 Wi-Fi SSID、远程推送、App Group 权限及下载 Live Activity 扩展。手动配置服务器、播放和弹幕仍保留；默认构建配置不受影响。

应用标识为 `org.personal.jellyfinmobile.dev`。重签工具可能添加团队后缀；后续覆盖更新需要保持兼容的签名与身份。

## 构建与安装

- CI 使用 Xcode 构建并加密测试包，不接收 Apple 账号、签名证书或设备标识。
- 安装需在兼容工具中完成签名；Mac 可使用 Xcode Personal Team，Windows/Mac 可参照 [Sideloadly 官方说明](https://sideloadly.io/)。
- 免费账号限制以 [Apple 账号说明](https://developer.apple.com/help/account/basics/about-your-developer-account) 为准；Personal Team 不等同于 App Store/TestFlight 分发权限。
- 构建要求有效的加密接收公钥；不应将明文测试包、凭据或诊断数据上传到公共制品存储。

## 验收与许可

安装后按 [验收清单](VALIDATION.md) 检查启动、登录、两种 MPV 播放路径、弹幕、字幕、切集、旋转、后台和 PiP。问题报告应使用脱敏的错误信息。

主项目与原生播放器适用不同许可证，详见 [许可与分发说明](LICENSE-AND-PRIVATE-REPO.md)。测试构建不表示已完成对外分发所需的全部合规核验。
