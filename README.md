# Asterfin

Jellyfin 客户端 · Android / iOS · 基于 Streamyfin 的开源衍生项目。

基于 [Streamyfin v0.55.2](https://github.com/streamyfin/streamyfin/releases/tag/v0.55.2) 的 Android / iOS 开源衍生客户端，先完善自托管 Jellyfin 的移动端观看与服务端 XML 弹幕。

**这是开发中的源码快照，不是稳定版。暂无已验证的 APK / IPA，也未完成真机验收。** 本项目不是 Jellyfin 或 Streamyfin 官方项目，不把上游已有功能宣称为全新自研。

## 本轮增量

- 直接读取已连接 Jellyfin 服务器上的 XML 弹幕，不从第三方重新搜索。
- Android / iOS 普通 MPV 与原生全屏两条路径均接入原生绘制代码。
- 弹幕开关、状态/重试、字号、不透明度、行数、显示时长、时间偏移。
- 媒体时间驱动，加载/暂停/seek/切集生命周期处理，保留下方普通字幕区域。
- 独立应用身份；不复用上游签名、EAS 更新/推送或崩溃报告项目。
- 回移上游访问令牌日志修复，避免播放/下载/字幕 URL 和 Android 图片调试日志泄露令牌；最终二进制仍需检查。

媒体库、搜索、继续观看、下一集、倍速、字幕、下载等沿用 Streamyfin 底座。首版弹幕范围限手机/平板的在线 Direct Play / Direct Stream；转码、直播、TV、离线弹幕、投屏与 PiP 弹幕暂不支持。整体视觉重设计和成就系统未做。

品牌更名保留既有包名、URL scheme 和签名身份，避免影响安装升级。详见[品牌与兼容性](docs/mobile-mvp/BRANDING.md)。

## 开发与状态

[中文起步说明](START-HERE.zh-CN.md) · [验证记录](docs/mobile-mvp/VALIDATION.md) · [Android 实现](docs/mobile-mvp/ANDROID.md) · [iOS 实现](docs/mobile-mvp/IOS.md)

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test:unit
bun run check
bun run i18n:check
bash tests/native/danmaku-android/run.sh
```

使用 Node >20 和 Bun 1.4.2。Android 完整构建需要 Android SDK；iOS 需要 Mac / Xcode / 签名配置。Expo Go 无法运行自定义原生播放器。测试记录区分源码检查、原生核心测试与未完成的整机验证，不能用 JS 测试代替手机测试。

CI 配置包含源码检查、macOS 上的 Swift 核心测试及 Android 集成编译，不生成或发布安装包。工作流配置不等于执行通过，实际结果以对应提交的 Actions 为准。上游发布、商店提交、通知和定时任务已归档，不会随本开发分支推送运行。

## 来源与许可

- 主项目来源：Streamyfin，固定提交 `4917c6aad9fcbc08f2dfb075310f3e85182d780e`。
- 保留 [MPL-2.0](LICENSE.txt)、原始作者与第三方版权声明。新增独立弹幕代码按 MPL-2.0 提供；未复制其他 GPL TV 客户端的渲染代码。
- **原生依赖另有 GPL 许可，不能把整个安装包描述为仅受 MPL 文件级义务约束。** 实际 iOS MPVKit av5 声明 GPL-3.0；Android 原生 AAR 的具体构成仍待最终制品核查。
- [许可证预审与仓库方案](docs/mobile-mvp/LICENSE-AND-PRIVATE-REPO.md)说明确认范围与发布前待办。开源源码不自动满足二进制对应源码、版权通知或分发渠道全部要求。
- 感谢 Streamyfin、Jellyfin、mpv、FFmpeg 及其依赖维护者。[上游 README 归档](docs/mobile-mvp/UPSTREAM-README.md)。应用名称为 Asterfin；图标暂沿用开发底座资源，不表示官方背书；正式发布前继续整理品牌和资产许可。

## English

Asterfin is an experimental Android/iOS derivative of Streamyfin v0.55.2 focused on local rendering
of existing Jellyfin-server XML danmaku. No third-party danmaku discovery is added.
Existing library, playback, resume, next-episode and download functionality comes from
Streamyfin. Both native and ordinary MPV paths are being integrated.

This is a source-development snapshot, **not a validated installable release**. Native
app builds, device behavior and final dependency/distribution compliance remain pending.
The source retains MPL-2.0; linked native components have separate GPL obligations.
