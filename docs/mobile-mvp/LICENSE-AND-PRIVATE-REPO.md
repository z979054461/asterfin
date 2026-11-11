# 许可与分发说明

Asterfin 是基于 Streamyfin 的开源衍生项目。主项目保留 [MPL-2.0](../../LICENSE.txt)、原始版权和作者署名；原生播放器及其他依赖适用各自的许可证。

## 原生依赖

- **Android**：`dev.jdtech.mpv:libmpv:1.0.0`。Maven 元数据中的 MIT 标记不能代表 AAR 内全部原生库的许可；[libmpv-android](https://github.com/jarnedemeulemeester/libmpv-android) 的原生组件涉及 GPL。发行前须核对该确切制品的组件、构建参数和对应源码。
- **iOS**：当前配置使用 Streamyfin 的 [MPVKit 0.41.0-av5](https://github.com/streamyfin/MPVKit/tree/0.41.0-av5)，其 podspec 声明 GPL-3.0 和静态 framework。主项目的 MPL 许可不替代这些义务。
- mpv、FFmpeg 的适用许可取决于实际构建与链接组件，参见 [mpv Copyright](https://github.com/mpv-player/mpv/blob/master/Copyright) 和 [FFmpeg LICENSE](https://github.com/FFmpeg/FFmpeg/blob/n8.1/LICENSE.md)。

## 分发要求

1. 保留 MPL、第三方许可证、版权及免责说明，并提供与所分发版本对应的受许可源码及取得方式。
2. 核对原生库的确切版本、构建参数、补丁和传递依赖，准备适用许可证要求的对应源码、构建及安装材料。
3. 核对图标、字体等资源授权，以及目标分发渠道的条款。公开应用源码不等于完成全部二进制分发合规要求。
4. 不得将整个安装包描述为仅受 MPL 文件级义务约束，也不得删除原作者或第三方依法应保留的声明。

完整原生依赖审计、对应源码材料和 App Store/TestFlight 渠道兼容性核验尚未完成。本文是项目技术说明，不是法律意见或上架承诺。MPL 的具体条款见 [Mozilla 正文及 FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)。
