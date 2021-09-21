import { JupyterFrontEnd } from '@jupyterlab/application';
import { ReactWidget, MainAreaWidget } from '@jupyterlab/apputils';
import React, { useState, useEffect } from 'react';
import { requestAPI } from './handler';

interface ILogsProps {
  command: string;
  schedule: string;
}

interface ILogsState {
  logs: string | undefined;
}

/**
 * React component for ViewLog
 *
 * @returns The React component
 */
const Logs = (props: ILogsProps): JSX.Element => {
  const [state, setState] = useState<ILogsState>({
    logs: undefined
  });

  const getLogs = async (schedule: string, command: string): Promise<void> => {
    let resp;

    try {
      resp = await requestAPI<any>(
        `scheduler/log?command=${command}&schedule=${schedule}`
      );
    } catch (error) {
      console.warn(`Error while fetching log for '${command}' : ${error}`);
    }

    if (resp && resp.success && resp.data) {
      setState({ logs: resp.data.reverse().join('\n') });
    }
  };

  useEffect(() => {
    getLogs(props.schedule, props.command);
  }, []);

  return (
    <div className="CodeMirror-scroll">
      <div className="jp-MediaLabLog-sizer">
        <pre>{state.logs}</pre>
      </div>
    </div>
  );
};

/**
 * A Lumino Widget that wraps a ViewLog component.
 */
class ViewLogWidget extends ReactWidget {
  _command: string;
  _schedule: string;

  /**
   * Constructs a new ShowWidget.
   */
  constructor(command: string, schedule: string) {
    super();

    this._command = command;
    this._schedule = schedule;

    this.addClass('jp-MediaLabLog');
    this.title.label = `Log - ${command}`;
    this.title.closable = true;
    this.id = 'medialab-job-log';
  }

  render(): JSX.Element {
    return <Logs command={this._command} schedule={this._schedule} />;
  }
}

export const openViewLogWidget = (
  shell: JupyterFrontEnd.IShell,
  schedule: string,
  command: string
): void => {
  // Create widget for displaying jobs & attach
  const content = new ViewLogWidget(command, schedule);
  const widget = new MainAreaWidget({ content });

  shell.add(widget, 'main');
};
