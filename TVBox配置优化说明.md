# TVBox 配置优化说明

## 🎯 针对 SSL handshake 错误和切换体验的优化

### 已完成的关键优化

#### 1. **Spider Jar 优化**

- ✅ **多源候选策略**：优先使用国内稳定源（gitcode.net, gitee.com）
- ✅ **SSL 兼容性**：优化请求头，减少 SSL handshake 错误
- ✅ **智能回退**：多个备选 jar，避免单点失败
- ✅ **连接优化**：使用 `Connection: close` 避免连接复用问题

#### 2. **新增配置模式**

支持多种配置模式，按需选择：

```bash
# 标准模式（默认）
https://你的域名/api/tvbox/config?mode=standard&format=json

# 影视仓优化模式
https://你的域名/api/tvbox/config?mode=yingshicang&format=json

# 快速切换优化模式（新增）
https://你的域名/api/tvbox/config?mode=fast&format=json

# 安全模式（最小配置）
https://你的域名/api/tvbox/config?mode=safe&format=json
```

#### 3. **专用 Jar 服务**

新增独立的 jar 服务端点，提升加载成功率：

```bash
# 直接获取优化的 jar 文件
https://你的域名/api/spider

# 强制刷新 jar 缓存
https://你的域名/api/spider?refresh=1
```

### 🚀 推荐使用方案

#### **方案一：影视仓用户**

```
订阅地址：https://你的域名/api/tvbox/config?mode=yingshicang&format=json
```

**特点**：

- ✅ 专门为影视仓优化
- ✅ 简化配置，减少冲突
- ✅ 移动端 UA，提升兼容性
- ✅ 强制启用所有搜索功能

#### **方案二：追求极速切换**

```
订阅地址：https://你的域名/api/tvbox/config?mode=fast&format=json
```

**特点**：

- ⚡ 移除可能导致卡顿的配置
- ⚡ 优化请求头，提升响应速度
- ⚡ 减少首页内容，加快加载
- ⚡ 使用极速解析和并发解析

#### **方案三：标准稳定版**

```
订阅地址：https://你的域名/api/tvbox/config?mode=standard&format=json
```

**特点**：

- 🛡️ 完整功能配置
- 🛡️ 多重容错机制
- 🛡️ 丰富的解析线路
- 🛡️ 适合大部分用户

### 🔧 针对 SSL 错误的解决方案

#### **问题分析**

"SSL handshake aborted" 错误通常由以下原因导致：

1. 网络环境对某些域名的 SSL 连接不稳定
2. jar 文件服务器的 SSL 配置问题
3. 设备或网络的 SSL 协议版本不兼容

#### **解决策略**

1. **多源候选**：自动尝试多个 jar 源，降低单点失败概率
2. **优化请求头**：使用移动端 UA 和优化的请求参数
3. **连接管理**：使用 `Connection: close` 避免连接复用问题
4. **智能缓存**：成功的 jar 缓存 6 小时，减少重复请求

### 📱 使用建议

#### **初次使用**

1. 建议先使用 **影视仓模式** 或 **快速模式**
2. 如果仍有问题，尝试 **安全模式**
3. 体检通过后，根据体验选择合适的模式

#### **遇到切换卡顿**

1. 切换到 **快速模式** (`mode=fast`)
2. 使用专用 jar 服务：在配置中手动指定 `?spider=https://你的域名/api/spider`
3. 定期清理 app 缓存

#### **网络环境不稳定**

1. 使用 **安全模式** (`mode=safe`)
2. 启用强制刷新：`?forceSpiderRefresh=1`
3. 考虑使用国内镜像部署

### 🎉 预期改善效果

- ✅ **SSL 错误大幅减少**：多源策略 + 优化请求头
- ✅ **切换速度提升**：快速模式 + 连接优化
- ✅ **稳定性增强**：智能回退 + 容错机制
- ✅ **兼容性提升**：移动端 UA + 简化配置

### 💡 高级用法

#### **自定义 jar**

```bash
# 使用自定义jar（必须是公网地址）
https://你的域名/api/tvbox/config?spider=https://你的jar地址.jar&format=json
```

#### **调试模式**

```bash
# 查看详细的spider选择信息
https://你的域名/api/tvbox/config?mode=standard&format=json
# 查看返回的 spider_* 字段了解选择过程
```

---

**立即部署，享受优化后的流畅体验！** 🚀
