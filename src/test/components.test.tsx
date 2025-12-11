import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Modal, Loading } from '../components/Common';

// 简单的组件渲染测试
describe('UI组件测试', () => {
  it('Button组件应该正确渲染', () => {
    render(<Button>测试按钮</Button>);
    expect(screen.getByText('测试按钮')).toBeDefined();
  });

  it('Loading组件应该正确渲染', () => {
    render(<Loading text="加载中..." />);
    expect(screen.getByText('加载中...')).toBeDefined();
  });

  it('Modal组件应该在打开时渲染', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="测试模态框">
        <div>模态框内容</div>
      </Modal>
    );
    expect(screen.getByText('测试模态框')).toBeDefined();
    expect(screen.getByText('模态框内容')).toBeDefined();
  });

  it('Modal组件应该在关闭时不渲染', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="测试模态框">
        <div>模态框内容</div>
      </Modal>
    );
    expect(screen.queryByText('测试模态框')).toBeNull();
  });
});