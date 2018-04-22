import * as React from 'react';
import { Layout, Menu } from 'antd';

const { Header: AntHeader } = Layout;

export default class Header extends React.Component<{}, {}> {
  render() {
    return (
      <AntHeader>
        <div className="logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['1']}
          style={{ lineHeight: '64px' }}
        >
          <Menu.Item key="1">nav 1</Menu.Item>
          <Menu.Item key="2">nav 2</Menu.Item>
          <Menu.Item key="3">nav 3</Menu.Item>
        </Menu>
      </AntHeader>
    );
  }
}