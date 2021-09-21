import { JupyterFrontEnd } from '@jupyterlab/application';
import { ToolbarButtonComponent, ReactWidget } from '@jupyterlab/apputils';
import { refreshIcon, closeIcon } from '@jupyterlab/ui-components';
import React, { useState, useEffect } from 'react';
import { requestAPI } from './handler';
import { openViewLogWidget } from './ViewLog';

interface ISection {
  title: string;
  content: React.ReactElement<any>;
  onRefresh: () => Promise<void>;
}

interface IVisualization {
  uid: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  locked: boolean;
  tags: Array<string>;
}

interface ICronjob {
  schedule: string;
  script: string;
  command: string;
  log_file: string;
}

const VizSection = (
  data: IVisualization[],
  onDelete: (uid: string) => void
): JSX.Element => {
  if (data.length === 0) {
    return <></>;
  }

  return (
    <table className="jp-MediaLabPanel-table">
      <thead>
        <tr>
          <th>UID</th>
          <th>Title</th>
          <th>Tags</th>
          <th>Date created</th>
          <th>Last modified</th>
          <th>Locked</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        {data.map(item => (
          <tr key={item.uid}>
            <td>{item.uid}</td>
            <td>{item.title}</td>
            <td>
              {item.tags.length === 0 && <i>No tags</i>}
              {item.tags.length > 0 && (
                <ul>
                  {item.tags.map(tag => (
                    <li>{tag}</li>
                  ))}
                </ul>
              )}
            </td>
            <td>{item.createdAt}</td>
            <td>{item.updatedAt}</td>
            <td>{item.locked ? 'Yes' : 'No'}</td>
            <td>
              <ToolbarButtonComponent
                key={`viz-close-${item.uid}`}
                icon={closeIcon}
                tooltip={`Delete visualization "${item.uid}"`}
                onClick={() => onDelete(item.uid)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const getCronID = (item: ICronjob): string => {
  return item.command.replace(' ', '-');
};

const CronSection = (
  data: ICronjob[],
  onDelete: (item: ICronjob) => void,
  onShellView: (item: ICronjob) => void
): JSX.Element => {
  if (data.length === 0) {
    return <></>;
  }

  return (
    <table className="jp-MediaLabPanel-table">
      <thead>
        <tr>
          <th>Schedule</th>
          <th>Script</th>
          <th>Command</th>
          <th>Log location</th>
          <th>Log</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        {data.map(item => {
          const id = getCronID(item);
          return (
            <tr key={`cron-${id}`}>
              <td>{item.schedule}</td>
              <td>{item.script}</td>
              <td>{item.command}</td>
              <td>{item.log_file}</td>
              <td>
                <ToolbarButtonComponent
                  key={`cron-view-${id}`}
                  label="View"
                  tooltip={`View logs for "${item.script}"`}
                  onClick={() => onShellView(item)}
                />
              </td>
              <td>
                <ToolbarButtonComponent
                  key={`cron-close-${id}`}
                  icon={closeIcon}
                  tooltip={`Remove schedule for "${item.script}"`}
                  onClick={() => onDelete(item)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

/**
 * React component for the main Panel.
 *
 * @returns The React component
 */
const Panel = (props: { shell: JupyterFrontEnd.IShell }): JSX.Element => {
  // Persist table data
  const [vizData, setVizData] = useState<IVisualization[] | []>([]);
  const [cronData, setCronData] = useState<ICronjob[] | []>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchData = async (choice: string): Promise<void> => {
    let resp;
    setIsLoading(true);

    try {
      if (choice === 'viz') {
        resp = await requestAPI<any>('viz/get_my_visualizations');
        setVizData(resp.data || []);
      } else {
        resp = await requestAPI<any>('scheduler/list');
        setCronData(resp.data || []);
      }
    } catch (error) {
      console.warn(`Error while requesting data : ${error}`);
    }

    setIsLoading(false);
  };

  const onVizDelete = async (uid: string): Promise<any> => {
    const data = { uid };

    try {
      await requestAPI<any>('viz/delete', {
        body: JSON.stringify(data),
        method: 'POST'
      });

      // Remove deleted item from state data
      setVizData(prevState => prevState.filter(item => item.uid !== uid));
    } catch (error) {
      console.warn(`Error while deleting visualization "${uid}" : ${error}`);
    }
  };

  const onCronDelete = async (item: ICronjob): Promise<any> => {
    const dataToSend = {
      command: item.command,
      schedule: item.schedule
    };

    try {
      await requestAPI<any>('scheduler/delete', {
        body: JSON.stringify(dataToSend),
        method: 'POST'
      });

      // Remove deleted item from state data
      setCronData(prevState =>
        prevState.filter(elem => getCronID(elem) !== getCronID(item))
      );
    } catch (error) {
      console.warn(`Error while deleting cronjob "${item.script}" : ${error}`);
    }
  };

  const onShellView = async (item: ICronjob): Promise<any> => {
    const { shell } = props;

    // Create widget for displaying log file & attach to shell (app.shell)
    openViewLogWidget(shell, item.schedule, item.command);
  };

  useEffect(() => {
    fetchData('viz');
    fetchData('scheduler');
  }, []);

  const sections: ISection[] = [
    {
      title: 'All visualizations',
      content: VizSection(vizData, onVizDelete),
      onRefresh: () => fetchData('viz')
    },
    {
      title: 'Scheduled visualizations',
      content: CronSection(cronData, onCronDelete, onShellView),
      onRefresh: () => fetchData('scheduler')
    }
  ];

  return (
    <div className="jp-Launcher-body">
      <div className="jp-Launcher-content">
        <div
          className={`jp-extensionmanager-pending ${
            isLoading ? 'jp-mod-hasPending' : ''
          }`}
        ></div>
        {sections.map((section, index) => (
          <div className="jp-Launcher-section" key={`section-${index}`}>
            <div className="jp-Launcher-sectionHeader">
              <h2 className="jp-Launcher-sectionTitle">{section.title}</h2>
              <ToolbarButtonComponent
                icon={refreshIcon}
                tooltip="Refresh list"
                onClick={section.onRefresh}
              />
            </div>
            <div className="jp-Launcher-cardContainer">{section.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * A Lumino Widget that wraps a Panel.
 */
export class MediaLabPanel extends ReactWidget {
  _shell: JupyterFrontEnd.IShell;

  /**
   * Constructs a new ShowWidget.
   */
  constructor(shell: JupyterFrontEnd.IShell) {
    super();

    this.addClass('jp-MediaLabPanel');
    this.id = 'medialab-visualizations';
    this.title.label = 'MediaLab visualizations';
    this.title.closable = true;

    this._shell = shell;
  }

  render(): JSX.Element {
    return <Panel shell={this._shell} />;
  }
}
