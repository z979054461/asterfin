# 验证与验收

构建、静态检查、核心单元测试和真机验收是不同阶段。工作流结果以对应提交的 [Actions](https://github.com/z979054461/asterfin/actions) 为准；绿色构建不代表播放、弹幕或设备兼容性已经验收。

## 自动检查

| 检查 | 入口 |
|---|---|
| TypeScript | `bun run typecheck` |
| Jest | `bun run test:unit` |
| Biome | `bun run check` |
| 翻译键 | `bun run i18n:check` |
| Android 弹幕核心 | `bash tests/native/danmaku-android/run.sh` |
| iOS 弹幕核心 | `bash tests/native/danmaku-ios/run.sh` |
| tvOS 遥控数值边界与接线 | `bash tests/native/danmaku-tvos/run.sh`（需 Swift 编译器） |
| Android TV 接线契约 | `python3 tests/native/danmaku-tv-android/check.py`（静态） |
| 原生工程与安装包 | 见 [测试构建](TEST-BUILDS.md) |

测试使用合成数据。核心测试覆盖解析、资源限制、媒体时钟及生命周期边界；不能穷尽真实播放器的事件顺序。Expo Doctor 的依赖维护或版本建议应独立审查，不应因其他步骤通过而忽略。

## 真机验收清单

- 安装、启动、登录、升级及应用身份。
- 普通 MPV 与原生全屏：续播、暂停、缓冲、前后拖动、倍速、快速切集与切换来源。
- 弹幕开关、状态、重试、设置、字体、字幕叠层、HDR、旋转及画面缩放。
- 空弹幕、认证失败、缺失文件、异常 XML、大小限制、gzip、慢响应、断网、取消及重定向拒绝。
- 后台/前台、PiP、退出期间请求取消，以及旧响应不能覆盖新来源。
- 长时间播放的内存、帧耗时、能耗和热状态。
- 日志脱敏、最终制品许可证与对应源码核对。

尚未完成跨设备真机验收，不应将开发快照标记为稳定版。平台实现与边界见 [Android](ANDROID.md) 和 [iOS](IOS.md)。

四端适配与设备矩阵见 [TV-PARITY.md](TV-PARITY.md)。当前提交的四端完整构建结果须分别查看 Actions；既有手机成功记录不能替代新增 TV 构建。
