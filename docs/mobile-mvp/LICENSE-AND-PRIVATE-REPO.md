# 移动客户端许可与私有仓库决策记录

核查日期：2026-11-09。用途：帮助决定当前 Streamyfin 衍生客户端如何保存、开发与将来分发。**这是工程合规预审，不是法律意见，也不是完整依赖审计或发布许可。** 用户随后已选择公开源码；下文保留私有方案供理解差异。代码公开不授权发布未验证安装包。

## 先说结论

- 仅在自己控制的设备上开发、修改和使用，不向他人分发，可先保持本地。MPL/GPL 不因个人私下修改就要求面向全网公开源码。
- 若需要私有远程备份，应在获得授权后创建**独立的私有仓库**。GitHub 上直接 Fork 公开仓库仍是公开的，不能单独把该 Fork 改为私有。
- **私有仓库不等于可以闭源分发 App。** 发给朋友、外部测试者、提供 APK 下载或通过商店分发，都应先检查接收者权利和相应源码交付，而不能用“免费”“内测”“没上架”替代合规。
- Streamyfin 主项目为 MPL-2.0，但实际 iOS 播放器明确引入 GPL-3.0 的静态 MPVKit。Android AAR 也有具体 GPL 风险。当前不能作出“只公开改动的 MPL 文件就能闭源发布整包”的结论。
- 公开源代码也不会自动消除原生库对应源码、版权声明、构建材料、商店条款和其他资产授权问题。**对外二进制发布暂不放行。**

## 1. 本地来源与确切范围

本地工作目录：`jellyfin-mobile`。核实开发基线为 `4917c6aad9fcbc08f2dfb075310f3e85182d780e`，对应标签 `v0.55.2`；恢复开发时将上游 remote 改名为 `upstream`（`https://github.com/streamyfin/streamyfin.git`），`origin` 改为获授权的 `https://github.com/z979054461/jellyfin-mobile.git`。开发增量放在独立 `mobile-dev` 分支，保留 `develop` 原样。

依据：本地 `LICENSE.txt`、`app.json`、`modules/mpv-player/android/build.gradle`、`modules/mpv-player/ios/MpvPlayer.podspec` 和原生桥接文件；线上读取维护者仓库与官方许可材料。当前工作树可能另有开发改动，HEAD 只能标识上游基线，不能代替发布源码快照。

[Streamyfin 基线](https://github.com/streamyfin/streamyfin/tree/4917c6aad9fcbc08f2dfb075310f3e85182d780e) 的根许可是 MPL-2.0。本次未逐一核验全部 npm、Gradle、CocoaPods、字体、图片、补丁和嵌入式二进制。根许可不能覆盖或改写所有依赖的许可。

## 2. 主项目 MPL：个人使用与分发

依据 [Mozilla FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) 及 [MPL 2.0 正文](https://www.mozilla.org/en-US/MPL/2.0/)：

1. 单纯个人使用和私下修改，不要求公开改动。
2. 分发包含 MPL 代码的可执行版本时，须让接收者及时、合理取得相应 MPL 源码，并告知取得方式；不能只给不包含自己改动的上游链接。
3. 修改既有 MPL 文件，以及新建但含有 MPL 代码的文件，属于受覆盖的修改。分发时保留 MPL 许可、原有版权和免责等声明；源文件不能仅因改名或挪目录就变为专有代码。
4. 独立新文件若不包含 MPL 代码，MPL 的文件级规则本身不要求该文件使用 MPL。但组合进 GPL 作品后，需要另外分析 GPL，不能只套用这条规则。
5. MPL 不要求一定使用公开 GitHub 仓库；可以选择其他合规源码交付方式。接收者在许可下的再分发权不能用保密条款剥夺。
6. 与 GPL 组合时还需核查 MPL 3.3 的 Secondary License 条件，包括受覆盖文件是否声明不兼容次级许可。本次没有完成全部文件的兼容性扫描。

建议每个版本保存：上游完整提交号、修改列表、依赖锁定文件、构建脚本、适用许可证和与该安装包对应的源码快照。保留 Git 历史有利于溯源，但不能代替合规交付。

## 3. Android：`dev.jdtech.mpv:libmpv:1.0.0`

**已确认：**

- 本地 `modules/mpv-player/android/build.gradle:66` 声明该确切坐标；原生 Kotlin 桥接导入 `dev.jdtech.mpv.MPVLib`，不是仅出现在无关文档里。
- [Maven Central 1.0.0 元数据](https://central.sonatype.com/artifact/dev.jdtech.mpv/libmpv/1.0.0) 标注 AAR、MIT，并把源码指向 `jarnedemeulemeester/libmpv-android`。这不代表其所有内嵌 `.so` 都是 MIT。
- [维护者当前 README](https://github.com/jarnedemeulemeester/libmpv-android) 明确区分 MIT 仓库源码与 AAR 原生二进制；后者因 mpv、FFmpeg 等组件整体按 GPL-3.0-or-later 处理。它列有 mpv、FFmpeg、libplacebo、libass、Lua、curl、mbedTLS、FreeType、fontconfig、FriBidi、HarfBuzz、libunibreak、dav1d、libxml2 等组件，各有自己的许可。
- [当前 FFmpeg 构建脚本](https://raw.githubusercontent.com/jarnedemeulemeester/libmpv-android/master/buildscripts/scripts/ffmpeg.sh) 开启 GPL 和 version3，并生成共享库。

**尚未确认：**

当前主分支资料不是 `1.0.0` 的冻结构建证据，不能把当前 README 的版本表直接当作 1.0.0 的 SBOM。本次未取得并验证确切 AAR 的哈希、原生库清单、原生构建提交、FFmpeg configure 结果及完整对应源码；尝试的 `1.0.0` 原始 README URL 不存在。

**发布判断：**按“存在 GPL 原生依赖、尚未完成确切制品核验”管理；不能因为 POM 写 MIT 就认定可闭源分发。即使使用共享库，也不能自动推导 GPL 不适用。

## 4. iOS：实际是 Streamyfin 的 `MPVKit 0.41.0-av5`

**已确认：**

- 本地 `app.json:175` 指向 `https://raw.githubusercontent.com/streamyfin/MPVKit/0.41.0-av5/MPVKit.podspec`；模块自身依赖名为 MPVKit。这是 Streamyfin 的 fork，不能拿其他 MPVKit 版本的许可替代。
- [该确切版本 podspec](https://raw.githubusercontent.com/streamyfin/MPVKit/0.41.0-av5/MPVKit.podspec) 明示 `GPL-3.0`、`static_framework = true`，下载目标为 Streamyfin 的 `0.41.0-av5/MPVKit.xcframework.zip`。
- [同标签 README](https://raw.githubusercontent.com/streamyfin/MPVKit/0.41.0-av5/README.md) 声明此 fork 使用 GPL 构建，含 samba/libsmbclient 等 GPL 组件；标示 mpv 0.41.0 与 FFmpeg n8.1。这是维护者声明，不是对下载二进制内容的独立验证。
- [同标签 Package.swift](https://raw.githubusercontent.com/streamyfin/MPVKit/0.41.0-av5/Package.swift) 则仍指向 `mpv-ios/MPVKit` 的 `0.41.0-av` 制品。因此不能把其 checksum 当成本项目 CocoaPods 所取 av5 压缩包的校验值。这一来源差异需要在构建验收中单独记录。

**尚未确认：**

尚无实际 iOS 安装产物的链接映射、锁文件核对、av5 XCFramework 哈希及逐库 SBOM；也未核实其全部补丁、FFmpeg 编译参数、第三方库版本和对应源码归档。README 的历史安装说明与实际 podspec 有差异，发布应以最终解析依赖和制品为准。

**发布判断：**GPL-3.0 静态播放器不是待猜测的普通 MIT 依赖；现有证据足以阻止“纯 MPL、可任意闭源发布”的判断。若分发该组合，应按 GPL 组合发布方案开展完整合规审查，包括对应源码、构建/安装材料、许可证和接收者权利。App Store/TestFlight 的现行条款、签名或 DRM 限制是否与该组合相容尚未审查，不能承诺上架；也不在此断言所有 GPL App 一概不能上架。

## 5. mpv / FFmpeg 的构建差异不能略过

[mpv 官方 Copyright](https://github.com/mpv-player/mpv/blob/master/Copyright) 说明默认 GPL，排除 GPL-only 代码可以构建 LGPL 版本，但配置开关本身不授予新的许可，链接库仍可改变结果。

[FFmpeg n8.1 LICENSE](https://raw.githubusercontent.com/FFmpeg/FFmpeg/n8.1/LICENSE.md) 区分默认 LGPL、启用 GPL、version3、外部库与 nonfree 配置；其中 smbclient 的组合需 GPL v3，nonfree 配置会使结果不可再分发。因此“不复制 GPL 源代码、只依赖二进制”不能绕过义务。也不能仅把配置中的 GPL 字样删掉就声称合规。

将来若希望保留部分闭源能力，可以评估替换播放器或可验证的 LGPL/宽松许可原生构建，但这是一项新的技术与合规工作。LGPL 也可能有库源码、替换/重新链接及相关材料要求，不能直接等同 MIT；还要验证弹幕、倍速、字幕、硬解、PiP 等功能是否受影响。

## 6. 仓库方案：已选择公开源码

[GitHub 官方 Fork 可见性说明](https://docs.github.com/en/pull-requests/reference/forks) 确认：公开仓库的 Fork 为公开，不能独立改变其可见性。

- **方案 A：暂时仅本地。** 当前可继续开发与自己使用，保留上游历史和许可。还没有远程备份，需独立考虑备份风险。
- **方案 B：独立私有仓库。** 待用户确定账号、仓库名及私有可见性并授权后，再新建空的私有仓库，核验可见性后推送。不要调用 GitHub 的公开 Fork 流程来实现私有副本。保留 upstream 用于同步，但推送目标必须单独核对。
- **方案 C：公开仓库。** 先检查工作树、完整 Git 历史及产物中有无令牌、服务器地址、个人媒体记录、日志、签名文件等不应公开内容，再授权创建或推送。公开代码不等于授权发布 APK/IPA。

私有副本仍需保留原许可与来源，不能宣称所有代码均由自己原创。也不要先推公开仓库再改私有：既有克隆、缓存和 Fork 可能已不可收回。第三方名称、图标和商标需单独处理；MPL 不授予商标权。

## 7. 发布前必须补齐的检查

- 冻结实际发行源码、JS/Gradle/Pod 解析结果；采集完整 SBOM，覆盖字体、资源、补丁和所有嵌入式原生库。
- 验证 Android 1.0.0 AAR 与 iOS av5 XCFramework 的来源、SHA-256、构建提交、编译参数及其各依赖源码是否可重建。
- 区分 MPL 文件义务、GPL 组合范围与各组件 NOTICE/版权要求，落实接收者取得对应源码的有效方式。必要时请熟悉开源许可的律师审核。
- 对安装包实际做二进制/链接审计，确认源码说明对应已交付版本，而非仅对应上游默认分支。
- 分别审查 Android 分发渠道与 iOS 商店/测试渠道限制；在确认前不对外发布。

**本次完成的是有明确边界的预审：主项目许可已确认；iOS av5 GPL 声明已确认；Android 1.0.0 精确原生构成及完整传递依赖审计仍未完成。**
