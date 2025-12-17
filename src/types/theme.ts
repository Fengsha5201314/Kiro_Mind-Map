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

// 预设主题配色方案
export const THEME_PRESETS: ThemeColors[] = [
  // 默认蓝色主题（经典商务风格）
  {
    id: 'ocean-blue',
    name: '海洋蓝',
    description: '经典商务风格，清新专业',
    levels: [
      { backgroundColor: '#1565c0', textColor: '#ffffff', borderColor: '#0d47a1' },
      { backgroundColor: '#1976d2', textColor: '#ffffff', borderColor: '#1565c0' },
      { backgroundColor: '#42a5f5', textColor: '#ffffff', borderColor: '#1976d2' },
      { backgroundColor: '#90caf9', textColor: '#0d47a1', borderColor: '#42a5f5' }
    ],
    edgeColor: '#64b5f6',
    selectedBorderColor: '#ff9800'
  },
  // 翡翠绿主题（自然清新风格）
  {
    id: 'emerald-green',
    name: '翡翠绿',
    description: '自然清新，护眼舒适',
    levels: [
      { backgroundColor: '#2e7d32', textColor: '#ffffff', borderColor: '#1b5e20' },
      { backgroundColor: '#43a047', textColor: '#ffffff', borderColor: '#2e7d32' },
      { backgroundColor: '#66bb6a', textColor: '#ffffff', borderColor: '#43a047' },
      { backgroundColor: '#a5d6a7', textColor: '#1b5e20', borderColor: '#66bb6a' }
    ],
    edgeColor: '#81c784',
    selectedBorderColor: '#ffc107'
  },
  // 紫罗兰主题（优雅高贵风格）
  {
    id: 'royal-purple',
    name: '紫罗兰',
    description: '优雅高贵，创意灵感',
    levels: [
      { backgroundColor: '#6a1b9a', textColor: '#ffffff', borderColor: '#4a148c' },
      { backgroundColor: '#8e24aa', textColor: '#ffffff', borderColor: '#6a1b9a' },
      { backgroundColor: '#ab47bc', textColor: '#ffffff', borderColor: '#8e24aa' },
      { backgroundColor: '#ce93d8', textColor: '#4a148c', borderColor: '#ab47bc' }
    ],
    edgeColor: '#ba68c8',
    selectedBorderColor: '#ffab00'
  },
  // 暖阳橙主题（活力温暖风格）
  {
    id: 'sunset-orange',
    name: '暖阳橙',
    description: '活力温暖，积极向上',
    levels: [
      { backgroundColor: '#e65100', textColor: '#ffffff', borderColor: '#bf360c' },
      { backgroundColor: '#f57c00', textColor: '#ffffff', borderColor: '#e65100' },
      { backgroundColor: '#ff9800', textColor: '#ffffff', borderColor: '#f57c00' },
      { backgroundColor: '#ffcc80', textColor: '#bf360c', borderColor: '#ff9800' }
    ],
    edgeColor: '#ffb74d',
    selectedBorderColor: '#2196f3'
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
