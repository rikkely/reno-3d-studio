# reno-3d-studio

一个从 5 m × 4 m 客厅起步的浏览器 3D 装修编辑器。坐标以米为单位，Y 轴向上，地面位于 XZ 平面。

## 第一阶段

- 使用 React、TypeScript、React Three Fiber 和 Drei 搭建可旋转、缩放的场景。
- 先用简单几何体验证家具拖动、0.1 m 网格吸附、0.15 m 墙面吸附与碰撞反馈，再接入经过尺寸和授权检查的 GLB。
- 用 JSON 和 localStorage 保存布局与材质选择；暂不接入账号、云端 API 或 AI。
