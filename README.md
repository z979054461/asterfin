<p align="center">
  <img src="https://raw.githubusercontent.com/z979054461/asterfin/v0.1.0-beta.1/assets/images/icon.png" alt="Asterfin 蓝紫色图标" width="160" height="160" />
</p>

# Asterfin

连接 Jellyfin 的开源播放器，基于 [Streamyfin](https://github.com/streamyfin/streamyfin)，支持手机与 TV。非 Jellyfin 或 Streamyfin 官方发行版。

[下载 v0.1.0-beta.1](https://github.com/z979054461/asterfin/releases/tag/v0.1.0-beta.1) · [开发代码](https://github.com/z979054461/asterfin/tree/mobile-dev) · [开发指南](https://github.com/z979054461/asterfin/blob/mobile-dev/START-HERE.zh-CN.md)

## 功能

- **Jellyfin 本地弹幕**：直接读取服务器已有 XML，不依赖第三方弹幕搜索。
- **弹幕设置**：开关、重试、字号、不透明度、行数、显示时长、时间偏移；TV 支持遥控器操作入口。
- **真实网速**：显示播放器实际媒体下载速度，缓冲时居中提示，控制栏实时显示；没有可靠数据时不显示估算值。
- **蓝紫色新图标**：统一手机与 TV 品牌资源。
- 媒体库、搜索、继续观看、下一集、倍速、字幕和下载沿用 Streamyfin 底座。

弹幕支持在线 Direct Play / Direct Stream，接入普通 MPV 和原生全屏路径；Android TV 原生全屏另支持 ExoPlayer。转码、直播、离线、投屏和 PiP 弹幕暂不支持。详见[四端适配说明](https://github.com/z979054461/asterfin/blob/mobile-dev/docs/mobile-mvp/TV-PARITY.md)。

## 版本与平台

**当前为测试版，构建通过不代表真机验收完成。**

| 平台 | 当前交付 | 条件与限制 |
| --- | --- | --- |
| Android 手机 / 平板 | 已发布签名 APK | Android 8.0+，arm64-v8a |
| Android TV | 已发布签名 APK | Android 8.0+，arm64-v8a；遥控器与播放仍需真机回归 |
| iOS / iPadOS | 已构建未签名侧载测试包，未公开分发 | iOS 16.4+；须自行重签，不能直接安装；个人签名构建不含 SSID 探测、远程推送及下载 Live Activity |
| tvOS | 完整应用编译通过，尚未分发安装包 | Apple 签名与分发配置未完成 |

本次 Release 仅附两个 APK，`android-arm64` 用于手机 / 平板，`android-tv-arm64` 用于 TV。二者沿用同一包名和原签名，不能在同一设备并存；应用版本为 `0.1.0`，Android `versionCode` 为 `2`。

源码检查及四端编译已通过，APK 已核验来源、签名、包名、版本和完整性；尚未完成各端真机播放、网络场景及遥控器回归。整体界面重设计和成就系统未实现。

## 开发

开发与新功能位于 **`mobile-dev`**；默认分支 `develop` 保留上游基线，不是 Asterfin 新功能的构建入口。

```sh
git clone --branch mobile-dev https://github.com/z979054461/asterfin.git
cd asterfin
bun install --frozen-lockfile
bun run typecheck
bun run test:unit
bun run check
bun run i18n:check
```

使用 Bun 1.4.2 与兼容的 Node 环境。Android 完整构建需要 Android SDK；Apple 平台需要 macOS / Xcode，设备安装还需要相应签名。Expo Go 不支持本项目的自定义原生播放器。修改后先运行相关本地检查及可用构建，再提交 CI。

[验证记录](https://github.com/z979054461/asterfin/blob/mobile-dev/docs/mobile-mvp/VALIDATION.md) · [测试构建](https://github.com/z979054461/asterfin/blob/mobile-dev/docs/mobile-mvp/TEST-BUILDS.md) · [贡献说明](CONTRIBUTING.md)

## 来源与许可

基于 Streamyfin v0.55.2，感谢原作者 [Fredrik Burmester](https://github.com/fredrikburmester) 及贡献者，以及 Jellyfin、mpv、FFmpeg 维护者。保留 [MPL-2.0](LICENSE.txt)、原始版权与第三方声明。

原生播放器依赖另有 GPL 等许可，**整个安装包不能视为仅受 MPL 文件级义务约束**。完整原生依赖审计、对应源码材料及 Apple 分发渠道核验仍有待完成，详见[许可与分发说明](https://github.com/z979054461/asterfin/blob/mobile-dev/docs/mobile-mvp/LICENSE-AND-PRIVATE-REPO.md)。
