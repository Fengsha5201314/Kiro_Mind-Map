/**
 * 思维导图主题配色类型定义
 */

// 单个层级的颜色配置
export interface LevelColors {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

// 主题配色方案
export interface ThemeColors {
  id: string;
  name: string;
  description: string;
  // 各层级颜色（0-3级，3级以上使用level3的颜色）
  levels: LevelColors[];
  // 连接线颜色
  edgeColor: string;
  // 选中边框颜色
  selectedBorderColor: string;
}

// 预设主题配色方案 - 高端专业设计
export const THEME_PRESETS: ThemeColors[] = [
  // ===== 高端暗黑系列 =====
  // 暗夜精英 - 深色商务风格
  {
    id: 'noir-elite',
    name: '暗夜精英',
    description: '高端暗黑，商务首选',
    levels: [
      { backgroundColor: '#0A0908', textColor: '#EAE0D5', borderColor: '#22333B' },
      { backgroundColor: '#22333B', textColor: '#EAE0D5', borderColor: '#5E503F' },
      { backgroundColor: '#5E503F', textColor: '#EAE0D5', borderColor: '#C6AC8E' },
      { backgroundColor: '#C6AC8E', textColor: '#0A0908', borderColor: '#5E503F' },
      { backgroundColor: '#EAE0D5', textColor: '#22333B', borderColor: '#C6AC8E' }
    ],
    edgeColor: '#5E503F',
    selectedBorderColor: '#C6AC8E'
  },
  // 深邃黑金 - 奢华暗黑
  {
    id: 'black-gold',
    name: '深邃黑金',
    description: '奢华黑金，尊贵典雅',
    levels: [
      { backgroundColor: '#1E1E1E', textColor: '#F1C40F', borderColor: '#333333' },
      { backgroundColor: '#2E4053', textColor: '#F1C40F', borderColor: '#1E1E1E' },
      { backgroundColor: '#333333', textColor: '#D5D8DC', borderColor: '#2E4053' },
      { backgroundColor: '#595959', textColor: '#D5D8DC', borderColor: '#333333' },
      { backgroundColor: '#A6A6A6', textColor: '#1E1E1E', borderColor: '#595959' }
    ],
    edgeColor: '#F1C40F',
    selectedBorderColor: '#F1C40F'
  },
  // ===== 高端紫色系列 =====
  // 紫韵天成 - 优雅紫色
  {
    id: 'violet-velvet',
    name: '紫韵天成',
    description: '优雅紫色，高贵典雅',
    levels: [
      { backgroundColor: '#4A235A', textColor: '#F4ECF7', borderColor: '#6C3483' },
      { backgroundColor: '#6C3483', textColor: '#F4ECF7', borderColor: '#A569BD' },
      { backgroundColor: '#A569BD', textColor: '#F4ECF7', borderColor: '#E8DAEF' },
      { backgroundColor: '#E8DAEF', textColor: '#4A235A', borderColor: '#A569BD' },
      { backgroundColor: '#F4ECF7', textColor: '#4A235A', borderColor: '#E8DAEF' }
    ],
    edgeColor: '#A569BD',
    selectedBorderColor: '#F1C40F'
  },
  // ===== 高端绿色系列 =====
  // 翡翠森林 - 自然奢华
  {
    id: 'emerald-essence',
    name: '翡翠森林',
    description: '自然奢华，沉稳大气',
    levels: [
      { backgroundColor: '#0D2B1D', textColor: '#E3EFD3', borderColor: '#345635' },
      { backgroundColor: '#345635', textColor: '#E3EFD3', borderColor: '#6B8F71' },
      { backgroundColor: '#6B8F71', textColor: '#0D2B1D', borderColor: '#AEC3B0' },
      { backgroundColor: '#AEC3B0', textColor: '#0D2B1D', borderColor: '#6B8F71' },
      { backgroundColor: '#E3EFD3', textColor: '#0D2B1D', borderColor: '#AEC3B0' }
    ],
    edgeColor: '#6B8F71',
    selectedBorderColor: '#F7DC6F'
  },
  // ===== 高端蓝色系列 =====
  // 深海蔚蓝 - 经典商务
  {
    id: 'azure-allure',
    name: '深海蔚蓝',
    description: '经典商务，专业可靠',
    levels: [
      { backgroundColor: '#1A5276', textColor: '#FFFFFF', borderColor: '#2980B9' },
      { backgroundColor: '#2980B9', textColor: '#FFFFFF', borderColor: '#85C1E9' },
      { backgroundColor: '#85C1E9', textColor: '#1A5276', borderColor: '#2980B9' },
      { backgroundColor: '#D4E6F1', textColor: '#1A5276', borderColor: '#85C1E9' },
      { backgroundColor: '#EBF5FB', textColor: '#1A5276', borderColor: '#D4E6F1' }
    ],
    edgeColor: '#5DADE2',
    selectedBorderColor: '#F7DC6F'
  },
  // ===== 高端暖色系列 =====
  // 琥珀暖阳 - 温暖奢华
  {
    id: 'amber-ambiance',
    name: '琥珀暖阳',
    description: '温暖奢华，品质感十足',
    levels: [
      { backgroundColor: '#804E27', textColor: '#F4E1D2', borderColor: '#BF7D3A' },
      { backgroundColor: '#BF7D3A', textColor: '#F4E1D2', borderColor: '#F7CA79' },
      { backgroundColor: '#F7CA79', textColor: '#383838', borderColor: '#BF7D3A' },
      { backgroundColor: '#F4E1D2', textColor: '#383838', borderColor: '#F7CA79' },
      { backgroundColor: '#FFF8F0', textColor: '#804E27', borderColor: '#F4E1D2' }
    ],
    edgeColor: '#BF7D3A',
    selectedBorderColor: '#383838'
  },
  // 日落余晖 - 温暖大气
  {
    id: 'sunset-glow',
    name: '日落余晖',
    description: '温暖大气，视觉舒适',
    levels: [
      { backgroundColor: '#3E2723', textColor: '#FFF3E0', borderColor: '#8D6E63' },
      { backgroundColor: '#D4A373', textColor: '#3E2723', borderColor: '#8D6E63' },
      { backgroundColor: '#8D6E63', textColor: '#FFF3E0', borderColor: '#D4A373' },
      { backgroundColor: '#FFE0B2', textColor: '#3E2723', borderColor: '#D4A373' },
      { backgroundColor: '#FFF3E0', textColor: '#3E2723', borderColor: '#FFE0B2' }
    ],
    edgeColor: '#D4A373',
    selectedBorderColor: '#3E2723'
  },
  // ===== 高端中性系列 =====
  // 摩卡时光 - 优雅中性
  {
    id: 'mocha-medley',
    name: '摩卡时光',
    description: '优雅中性，永恒经典',
    levels: [
      { backgroundColor: '#332820', textColor: '#EFEDEA', borderColor: '#5A4D40' },
      { backgroundColor: '#5A4D40', textColor: '#EFEDEA', borderColor: '#D5AA9F' },
      { backgroundColor: '#D5AA9F', textColor: '#332820', borderColor: '#5A4D40' },
      { backgroundColor: '#D0C6BD', textColor: '#332820', borderColor: '#D5AA9F' },
      { backgroundColor: '#EFEDEA', textColor: '#332820', borderColor: '#D0C6BD' }
    ],
    edgeColor: '#5A4D40',
    selectedBorderColor: '#D5AA9F'
  },
  // 香槟雅致 - 柔和奢华
  {
    id: 'champagne-chic',
    name: '香槟雅致',
    description: '柔和奢华，品味独特',
    levels: [
      { backgroundColor: '#2B1C10', textColor: '#F4E1D2', borderColor: '#6E493A' },
      { backgroundColor: '#6E493A', textColor: '#F4E1D2', borderColor: '#987284' },
      { backgroundColor: '#987284', textColor: '#F4E1D2', borderColor: '#E1D4C1' },
      { backgroundColor: '#E1D4C1', textColor: '#2B1C10', borderColor: '#987284' },
      { backgroundColor: '#F4E1D2', textColor: '#2B1C10', borderColor: '#E1D4C1' }
    ],
    edgeColor: '#987284',
    selectedBorderColor: '#6E493A'
  },
  // ===== 高端混合系列 =====
  // 经典优雅 - 海军蓝金
  {
    id: 'classic-elegance',
    name: '经典优雅',
    description: '海军蓝金，永恒经典',
    levels: [
      { backgroundColor: '#2E4053', textColor: '#F1C40F', borderColor: '#1B2631' },
      { backgroundColor: '#5D6D7E', textColor: '#F1C40F', borderColor: '#2E4053' },
      { backgroundColor: '#AAB7B8', textColor: '#2E4053', borderColor: '#5D6D7E' },
      { backgroundColor: '#D5D8DC', textColor: '#2E4053', borderColor: '#AAB7B8' },
      { backgroundColor: '#F1C40F', textColor: '#2E4053', borderColor: '#D5D8DC' }
    ],
    edgeColor: '#5D6D7E',
    selectedBorderColor: '#F1C40F'
  },
  // 玫瑰金韵 - 柔美高级
  {
    id: 'blush-balance',
    name: '玫瑰金韵',
    description: '柔美高级，温柔优雅',
    levels: [
      { backgroundColor: '#443737', textColor: '#F4E1D2', borderColor: '#987284' },
      { backgroundColor: '#987284', textColor: '#F4E1D2', borderColor: '#D5AA9F' },
      { backgroundColor: '#D5AA9F', textColor: '#443737', borderColor: '#E8D5B7' },
      { backgroundColor: '#E8D5B7', textColor: '#443737', borderColor: '#D5AA9F' },
      { backgroundColor: '#F4E1D2', textColor: '#443737', borderColor: '#E8D5B7' }
    ],
    edgeColor: '#987284',
    selectedBorderColor: '#443737'
  },
  // 极简灰调 - 现代简约
  {
    id: 'minimal-gray',
    name: '极简灰调',
    description: '现代简约，清晰专业',
    levels: [
      { backgroundColor: '#1E1E1E', textColor: '#F1EFEF', borderColor: '#595959' },
      { backgroundColor: '#595959', textColor: '#F1EFEF', borderColor: '#A6A6A6' },
      { backgroundColor: '#A6A6A6', textColor: '#1E1E1E', borderColor: '#D0D0D0' },
      { backgroundColor: '#D0D0D0', textColor: '#1E1E1E', borderColor: '#A6A6A6' },
      { backgroundColor: '#F1EFEF', textColor: '#1E1E1E', borderColor: '#D0D0D0' }
    ],
    edgeColor: '#A6A6A6',
    selectedBorderColor: '#1E1E1E'
  }
];

// 获取主题配色
export const getThemeById = (themeId: string): ThemeColors => {
  return THEME_PRESETS.find(t => t.id === themeId) || THEME_PRESETS[0];
};

// 获取指定层级的颜色
export const getLevelColors = (theme: ThemeColors, level: number): LevelColors => {
  const index = Math.min(level, theme.levels.length - 1);
  return theme.levels[index];
};
