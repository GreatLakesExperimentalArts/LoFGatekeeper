import * as React from 'react';
import { Layout as AntdLayout } from 'antd';
import Header from './Header';
import './index.less';

const { Content, Footer } = AntdLayout;

export default class Layout extends React.Component<{}, {}> {
  render() {
    return (
      <AntdLayout className="layout">
        <Header />
        <Content style={{ padding: '0 50px' }}>
          <div style={{ padding: 0, minHeight: '90vh' }}>
            {this.props.children}
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }} />
      </AntdLayout>
    );
  }
}