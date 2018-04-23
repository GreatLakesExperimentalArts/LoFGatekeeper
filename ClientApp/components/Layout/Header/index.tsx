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
          <Menu.Item key="1">Wristband Entry</Menu.Item>
          <Menu.Item key="2">Volunteers</Menu.Item>
          <Menu.Item key="3">nav 3</Menu.Item>
        </Menu>
      </AntHeader>
    );
  }
}