# Asterfin iOS 个人测试包

本配置只用于项目所有者自己的 iPhone/iPad 测试。产物是 **未签名 IPA**，不能直接点击安装，也不代表真机测试已通过。默认正式功能配置保持不变。

## Windows / Mac 安装选择

- 不要求先买 Apple Developer Program。可在自己的 Windows 或 Mac 上使用 [Sideloadly 官方版](https://sideloadly.io/)，用自己的 Apple 账号重新签名并通过 USB 安装；请按官网要求安装 Apple 驱动。
- Mac 也可用 Xcode 的 Personal Team 从源码签名运行。
- 免费 Personal Team 有期限和数量限制。按 [Apple 账号说明](https://developer.apple.com/help/account/basics/about-your-developer-account)，免费签名通常需要每 7 天刷新，单台设备最多 3 个这类 App，并受 App ID / 设备限制约束。
- 登录密码、双重验证、信任电脑和开发者模式由设备所有者自行处理，不要发到聊天、代码仓库或 Actions Secrets。不要使用陌生企业证书、共享 Apple 账号或付费免签服务。
- 本包保留 org.personal.jellyfinmobile.dev 身份。重签工具可能附加团队后缀；以后更新使用同一账号和身份，避免额外安装成另一个 App。

## 测试配置差异

ASTERFIN_IOS_PERSONAL_TEAM=1、EXPO_TV=0 时：去掉 Wi-Fi SSID 权限、远程推送权限、App Group 与下载 Live Activity 扩展。手动填写 Jellyfin 地址、播放和弹幕仍保留。Wi-Fi 名称自动切换、远程推送与锁屏下载实时活动不在本包验收范围内。没有改动默认构建的这些能力。

先验收：安装启动 → 自己的 Jellyfin 登录 → 同一集普通 MPV / 原生全屏播放 → 开关弹幕 → 暂停/拖动/倍速 → 切集/退出/旋转 → 字幕共存 → 后台和 PiP 返回。测试时勿截图或分享服务器地址、账号、媒体记录或令牌。失败只回报错误文字（去掉身份信息）、iOS 版本与设备型号。

## 隐私与产物

CI 不接收 Apple 账号、证书或设备 ID，不对 App 签名。仅在加密后上传测试包，公共仓库中不提供明文 IPA 或公开 Release。本轮加密接收公钥在 2026-11-17 16:17 UTC 到期，之后构建会停止，需更新接收公钥。保留期限为一天；接收者获得明文后应自行妥善保管。构建日志也只放进加密诊断文件。

源码默认关闭 Sentry，未配置上游 Expo 推送或 OTA 项目。本测试流程不连接任何真实 Jellyfin 服务器。生成包内包含源码提交、IPA SHA-256、Podfile.lock、项目源码快照与许可证。本说明不是动态网络隐私审计。

## 许可证与分发边界

主项目源自 Streamyfin，保留 MPL-2.0 和作者署名。实际 iOS MPVKit 0.41.0-av5 使用 GPL-3.0，不能把安装包说成纯 MPL。项目源码快照不是原生依赖全部对应源码，逐项 SBOM、第三方源码、资产许可及商店条款核验仍待完成。本次只准备所有者个人测试，不公开分发、上架或承诺 TestFlight 可用。后续对外分发前需完成 docs/mobile-mvp/LICENSE-AND-PRIVATE-REPO.md 的待办。
