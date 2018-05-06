import * as React from 'react';
import { Link } from 'react-router-dom';
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
          defaultSelectedKeys={['Wristbands']}
          style={{ lineHeight: '64px' }}
        >
          <Menu.Item key="Wristbands"><Link to="/">Wristband Entry</Link></Menu.Item>
          <Menu.Item key="Volunteers"><Link to="/volunteers">Volunteers</Link></Menu.Item>
          <Menu.Item key="incidents"><Link to="/indicents">Incident Log</Link></Menu.Item>
        </Menu>
      </AntHeader>
    );
  }
}