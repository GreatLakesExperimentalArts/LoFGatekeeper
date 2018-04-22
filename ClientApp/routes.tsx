import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import Attendees from './components/Attendees';

export const routes = (
  <Layout>
    <Switch>
      <Route exact={true} path="/" component={Attendees} />
      <Route exact={true} path="/attendees" component={Home} />
    </Switch>
  </Layout>
);
