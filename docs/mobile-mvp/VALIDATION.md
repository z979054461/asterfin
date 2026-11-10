# 验证记录 · 2026-11-09

基线 Streamyfin v0.55.2，提交 4917c6aad9fcbc08f2dfb075310f3e85182d780e。环境 Linux x86_64、Node24、Bun1.4.2、OpenJDK21；无 Android SDK / Xcode。所有测试使用合成数据或本地 loopback HTTP，不含用户服务器/账户数据。

## 实际执行

| 检查 | 结果 | 说明 |
|---|---|---|
| 原版依赖安装 | 通过 | `bun install --frozen-lockfile`，未更改锁文件 |
| 原版 TypeScript 基线 | 通过 | 修改前执行 |
| 修改后 TypeScript | 通过 | `bun run typecheck` |
| 完整 Jest | 通过 | 155 suites、1972 tests；含33条配置/身份测试与4条界面行为测试 |
| Biome lint/format/check | 通过 | 全仓库检查；无隐藏诊断 |
| i18n key check | 通过 | 无缺失/无未使用 key；上游两处完全动态 key 提示保留 |
| Android 原生工程预生成 | 通过 | `expo prebuild --platform android --no-install`；独立 applicationId 已核对 |
| Android Java 生产核心 | 通过 | 257 assertions，真实核心编译；包含 loopback HTTP/gzip/30x/认证头/限额/解析/布局/媒体时钟 |
| Android Kotlin 覆盖层定向编译 | 通过 | Kotlin2.1.20 + Maven Android framework；真实 Java 核心、Overlay、DeviceKind，无 stub；不等同完整 Expo/mpv 编译 |
| iOS 静态生命周期检查 | 通过 | 11条，只检查源码结构，不执行 Swift |
| iOS Swift 核心测试 | 未运行 | runner exit77，缺少 swiftc |
| Expo Doctor | 19/20 | 上游 `react-native-edge-to-edge` 被目录标记 unmaintained；未通过排除配置隐藏此问题 |
| Kotlin/Swift 整个 App 编译 | 未运行 | 缺少 Android SDK / Xcode |
| 真机/模拟器 | 未运行 | 未接入设备 |
| APK/IPA、签名与发布 | 未执行 | 无可安装包 |

`bun run test` 的 typecheck、Jest、lint、format、i18n 均通过，最终在 Expo Doctor 项退出非零，因此**不能称总质量门禁全部通过**。首次 Expo CLI 默认写入不可用的 home 路径失败；改为工作区可写的临时 HOME 并关闭 CLI 遥测后，预生成成功，Doctor 得到上表实际诊断。

移除了上游 Sentry 构建插件，因此 Doctor 还提示缺少该原生上传配置；这是本地默认关闭上游崩溃报告/源码映射上传的预期结果，不应运行其建议命令把上游服务绑定回来。未来若启用自己的遥测，应单独完成项目与明确用户同意设置。

## 关键未验证项

- 原生 Swift/Kotlin API 与 Expo bridge 的完整编译、双平台启动。
- 动画与文字实际画面、不同中文/emoji 字体、字幕叠层、HDR/旋转/缩放/刘海区域。
- 真实 MPV 的事件顺序，尤其多个快速 seek、load、EOF 与退出交错时，单元测试不能穷尽。
- 网络栈在真机上的 TLS、解压与取消行为；iOS transport 尚未跑真实网络测试。
- 真实用户插件版本、XML 兼容、下载与进度回传回归、播放期间的能耗。
- 每个最终原生二进制对应的许可证、源码和分发渠道兼容性。

本快照可继续开发和审查，不能标记为可发布或稳定版。

## 恢复核验 · 2026-11-09

重新执行并通过：TypeScript、完整 Jest（155 suites / 1972 tests）、全仓库 Biome、i18n、Android Java 核心（257 assertions）、真实 Kotlin 覆盖层定向编译，以及 iOS 静态生命周期检查（11 条）。Swift 核心 runner 再次返回 exit77，未执行 Swift。恢复时本地改动尚未出现在远端可见分支。

新增独立 `mobile-dev` 分支的原生 CI 配置：macOS 执行 Swift 核心测试，Linux 执行 Android App/模块 Kotlin 编译。CI 不打包、不上传安装包、不使用签名凭据。配置本身不是通过记录；Swift 核心通过也不代表 UIKit/Expo/MPVKit 整机编译或真机通过。以该提交的实际 Actions 结果和后续记录为准。

恢复审查另修复两项 iOS 源码问题：超出屏幕宽度的滚动弹幕不再被全部丢弃；无配置或关闭弹幕时停止 30Hz 绘制回调，并通过应用生命周期及 PiP 事件刷新控制显示。新增 10 条 Swift 布局断言，静态结构检查增至 19 条；本地无 Swift/UIKit，不能把这些改动标作已通过真机行为测试。

同时定向回移 [Streamyfin 的令牌日志修复](https://github.com/streamyfin/streamyfin/commit/df7bdf9cc57c824eba525961295cc0e65fb46c7d)：Android 的 expo-image 改为源码编译，下载/字幕/视频 URL 日志脱敏，停止记录可能把凭据藏在路径中的外部流 URL。保留固定依赖版本与锁文件，未把整个上游 develop 分支混入开发基线。最终 Android 制品中的 Glide 日志开关和实际 logcat 仍需验收。

### 最终本地回归

- 完整 Jest：155 suites / 1975 tests 通过，使用 `--maxWorkers=1 --workerIdleMemoryLimit=512MB`。不限制并发时发生 worker SIGKILL，两 worker 复跑仍有一个被杀；限制并发并定期回收 worker 后完整通过。CI 也设置 worker 内存回收。三条新增日志回归在修复前失败、修复后通过。
- 真实 Kotlin 日志脱敏函数：独立编译并执行五条上游回归用例通过。不是整个原生模块的 Gradle/JUnit 测试通过。
- 类型检查、Biome lint/format/check、i18n 通过；iOS 结构检查 19 条通过，Swift 执行仍待 CI。
- 最终 Expo Doctor 为 **18/20**：保留 `react-native-edge-to-edge` 维护警告，并新增在线 SDK 版本表对 19 个补丁版本的升级建议。未为消除提示而更改锁文件或隐藏诊断。因此完整质量门禁仍未全部通过。

## GitHub 首轮原生 CI · 2026-11-10

源码快照已推送到独立 `mobile-dev` 分支，提交 `c9d785ea3b2fad8a25f85c9d310832732057010f`；`develop` 未改动。

- [源码检查](https://github.com/z979054461/jellyfin-mobile/actions/runs/42740288603)通过：155 suites / 1975 tests、TypeScript、Biome、i18n、Java 核心 257 条与 iOS 静态 19 条断言。Expo Doctor 仍为 18/20；该步骤允许失败，因此绿色工作流不代表 Doctor 无告警。
- [原生检查](https://github.com/z979054461/jellyfin-mobile/actions/runs/42740288686)中，macOS 首次编译并运行 Swift 生产核心，53 条断言通过。该测试未编译 UIKit/Expo/MPVKit App，也没有运行模拟器或真机。
- Android 预生成成功，但编译停在 `:app:checkDebugAarMetadata`：Cast 插件默认 `+` 拉入 Cast 23 / MediaRouter 1.9.0-beta01，要求 API 37 与 AGP 9.1，而当前基线使用 API 36 / AGP 8.12。
- 后续修复通过插件正式配置项将 Cast SDK 固定为 22.3.1，避免动态升级越过工具链兼容边界。新增配置回归测试在修复前失败；整机编译结果以修复提交的 Actions 为准，不能把依赖固定当作已构建通过。

没有生成或发布 APK/IPA，没有访问用户服务器、设备或签名账户。

## Complete test-build checks · 2026-11-10

The Cast SDK fix at `df6aad89dd75cf0434bb2598a27cd88e8bfcfbbd` passed
[source CI](https://github.com/z979054461/jellyfin-mobile/actions/runs/42742932347)
and [native CI](https://github.com/z979054461/jellyfin-mobile/actions/runs/42742932544).
The latter compiled the Android app and its native modules with
`:app:compileDebugKotlin`, and ran the Swift production core. It did not package
an APK or compile the complete iOS app.

The complete-build workflow commit is `405c392f642e756650413345157fb34fb2b93288`.
Its [source checks](https://github.com/z979054461/jellyfin-mobile/actions/runs/42746414029)
passed: 155 suites / 1976 tests, TypeScript, Biome, i18n, Java core 257 assertions
and iOS static 19 assertions. Expo Doctor remains 18/20 (the existing unmaintained
edge-to-edge package warning and 19 SDK patch-version suggestions). The separate
Swift production core job passed 53 assertions.

- [Android full build](https://github.com/z979054461/jellyfin-mobile/actions/runs/42746414121)
  passed in 18m51s. It generated an unsigned ARM64 Release APK of 109,601,527 bytes.
  Development package identity, non-debuggable manifest, bundled JavaScript,
  DEX, MPV/Hermes/React Native libraries, and unsigned status were checked.
  SHA256: `f68a21f6451227da9fb78fe0e4ef02bf67a35f4b56cedbf14b19d24b70aa1a45`.
  This APK cannot be installed without separately authorized signing.
- [iOS full build](https://github.com/z979054461/jellyfin-mobile/actions/runs/42746414626)
  passed Xcode 26.6 / Metal setup, CocoaPods, and the complete unsigned arm64
  Release app compilation step (16m37s). The final output-verification step failed,
  so the workflow is not a full pass. Review found an independently invalid `lipo`
  argument order in that step. The verification command is corrected and the build
  log output is bounded so future failures remain inspectable; the rerun must pass
  before reporting complete iOS output verification. The first full log could not
  be retrieved through the connector, so the exact failed assertion is unconfirmed.

Both runs have empty artifact lists. No APK/IPA binary or release was uploaded,
no signing key was used, and no user server/device was accessed. There has been no
emulator, physical-device, playback, or danmaku integration run. See
[TEST-BUILDS.md](TEST-BUILDS.md) for the remaining runtime validation.
