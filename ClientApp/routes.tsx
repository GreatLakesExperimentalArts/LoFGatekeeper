import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import Attendees from './components/Attendees';
import Volunteers from './components/Volunteers';
import IncidentLog from './components/IncidentLog';

export const routes = (
  <Layout>
    <Switch>
      <Route exact={true} path="/" component={Attendees} />
      <Route exact={true} path="/volunteers" component={Volunteers} />
      <Route exact={true} path="/incidentLog" component={IncidentLog} />
    </Switch>
  </Layout>
);
