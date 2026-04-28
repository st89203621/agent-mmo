import React from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './PageError.module.css';

interface Props {
  children: React.ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class PageErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PageError]', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleHome = () => {
    this.setState({ hasError: false, error: undefined });
    useGameStore.getState().replaceTo('home');
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className={styles.wrap}>
        <div className={styles.icon}>⚠</div>
        <div className={styles.title}>此 页 暂 无 法 显 示</div>
        <div className={styles.hint}>请稍后再试，或返回首页继续江湖路。</div>
        <div className={styles.actions}>
          <button type="button" className={styles.btnSec} onClick={this.handleHome}>返 回 首 页</button>
          <button type="button" className={styles.btnPrim} onClick={this.handleReset}>重 试</button>
        </div>
      </div>
    );
  }
}

export default PageErrorBoundary;
