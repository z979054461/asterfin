# Asterfin · 0.1.0 开发快照

这是基于 Streamyfin 的**开源开发版本**，尚未完成真机验收。项目名称为 Asterfin，保留原有应用标识与签名身份。源码公开不代表已发布可安装 App。

## 已实现的增量

- Android/iOS/Android TV/tvOS 均接入服务端现有 `GET /api/danmu/{itemId}/raw` XML，覆盖普通 MPV 与独立原生全屏两条播放器路径。不向第三方搜索弹幕，不需要额外的 Streamyfin 弹幕服务。
- 原生弹幕绘制、真实媒体时钟、滚动/顶部/底部三种模式、保留下方字幕区；开关、重试、字号、不透明度、行数、显示时长和正负时间偏移。
- 设置 → 播放与控制中提供弹幕设置。普通播放器点击“弹幕”切换，长按查看状态/重试，旁边的设置按钮可直接调整；原生全屏也提供“弹幕设置”。修改即时生效并保存到下次播放，无需退出视频。
- 四端在线 Direct Play / Direct Stream 启用弹幕。TV 原生路径使用“更多 → 弹幕设置”，旧版 React TV 路径使用控制栏入口；同一套六项设置保存在当前设备。转码、直播、离线、投屏、外部播放器和画中画弹幕暂不支持。视频下载能力沿用底座，不等于已实现离线弹幕。
- 使用独立应用标识 `org.personal.jellyfinmobile.dev`，不会覆盖原版。移除了上游 Apple Team、EAS 发布/推送/更新绑定；默认不向上游上传崩溃报告。

媒体库、搜索、继续观看、下一集、倍速、字幕、下载等沿用 Streamyfin 现有实现。此轮重点是新增弹幕与独立构建基础；深色海报布局保留，尚未完成整体视觉重设计。成就系统未做。

## 验证

本轮 TV 适配与逐端验收范围见[四端适配说明](docs/mobile-mvp/TV-PARITY.md)。代码接入、静态测试与真实遥控器验收是不同阶段；不能用既有手机构建替代本轮四端构建。

详见 [验证记录](docs/mobile-mvp/VALIDATION.md)。JS 完整测试、类型检查、Biome 和 i18n 检查有实际执行记录；Android 原生工程已成功预生成。Android Java 核心用真实生产代码及本地合成 HTTP 服务执行了测试。

构建与签名流程见[测试构建](docs/mobile-mvp/TEST-BUILDS.md)。真机播放、插件兼容、HDR/字幕叠层、能耗和流畅度仍需验收；源码测试不能代替设备测试。

## 固定上游

- [Streamyfin v0.55.2](https://github.com/streamyfin/streamyfin/releases/tag/v0.55.2)
- 基线提交：`4917c6aad9fcbc08f2dfb075310f3e85182d780e`
- 原有 MPL-2.0 许可证保留于 `LICENSE.txt`。新增弹幕代码独立编写，没有复制 GPL TV 客户端的渲染实现。
- **底座原生播放器另有 GPL 许可，不能据主项目的 MPL 宣称整个 App 可闭源分发。** 分发前阅读 [许可与分发说明](docs/mobile-mvp/LICENSE-AND-PRIVATE-REPO.md)。该文档是技术核对，不替代法律意见。

## 继续开发

环境：Node >20、Bun 1.4.2。仅用 Bun，保留锁文件。

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test:unit
bun run check
bun run i18n:check
bash tests/native/danmaku-android/run.sh
```

Android 需 Android Studio/SDK：SDK 36、Build Tools 35.0.0、NDK 29.0.14206865，以及兼容 Gradle 的 JDK；具体以生成工程为准。

```sh
EXPO_TV=0 bunx expo prebuild --platform android --no-install
bun run android
```

iOS 需要 Mac/Xcode 和项目要求的 Metal/MPVKit 工具链。先运行 `bash tests/native/danmaku-ios/run.sh`，再使用 `bun run prebuild` / `bun run ios`。Expo Go 不支持这些自定义原生模块。

免费 Apple Personal Team 真机签名存在 7 天期限；EAS 真机云构建/Ad Hoc/TestFlight 需要自行配置合适的开发者账户和签名。请配置独立签名，不要在仓库中存放凭据。

## 验收顺序

1. 确认待测提交的原生构建和测试通过，使用对应测试包。
2. 用临时本地 Jellyfin 与合成 XML 测试，避免将真实凭据写入测试数据。
3. 真机覆盖普通/原生全屏、续播、暂停、前后拖动、快速切集/换源、0.5×/1×/2×、缓冲、重试、旋转、后台、PiP 和普通字幕。
4. 检查慢请求晚到、反代路径、自定义代理认证、空/缺失/过大/恶意 XML、gzip、网络中断及重定向拒绝。
5. 测量帧耗时、内存、热状态与电量，再决定提高弹幕密度。当前采用稀疏、保守的行占用策略。
6. 分发二进制前完成原生依赖许可证与对应源码核对。
