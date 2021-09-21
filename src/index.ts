import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu } from '@lumino/widgets';
import {
  ICommandPalette,
  MainAreaWidget,
  showDialog,
  Dialog,
  showErrorMessage
} from '@jupyterlab/apputils';
import { runIcon } from '@jupyterlab/ui-components';

import { MediaLabPanel } from './Panel';
import { AddCronjob } from './AddCronjob';
import { requestAPI } from './handler';

/**
 * The command IDs used by the react-widget plugin.
 */
namespace CommandIDs {
  export const show = 'show-viz';
  export const addCron = 'jupyterlab_medialab/add-cron:open';
}

/**
 * Initialization data for the jupyterlab_medialab extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_medialab:plugin',
  autoStart: true,
  requires: [
    JupyterFrontEnd.IPaths,
    IFileBrowserFactory,
    ICommandPalette,
    IMainMenu
  ],
  activate: (
    app: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    factory: IFileBrowserFactory,
    palette: ICommandPalette,
    mainMenu: IMainMenu
  ) => {
    const { commands, shell } = app;

    // Add command to list all visualizations
    commands.addCommand(CommandIDs.show, {
      label: 'List all visualizations',
      caption: 'List all MediaLab visualizations',
      execute: (args: any) => {
        const content = new MediaLabPanel(shell);
        const widget = new MainAreaWidget<MediaLabPanel>({ content });

        shell.add(widget, 'main');
      }
    });

    // Add a command to schedule a cronjob
    commands.addCommand(CommandIDs.addCron, {
      label: 'Schedule visualization',
      caption: 'Schedule recurring execution for visualizations',
      icon: runIcon,
      execute: async (args: any) => {
        // Create dialog for scheduling jobs
        const file = factory.tracker.currentWidget
          ? factory.tracker.currentWidget.selectedItems().next()
          : null;

        if (!file) {
          console.warn(
            `Executed command ${CommandIDs.addCron} with null file.`
          );
          return;
        }

        const fullPath: string = paths.directories.serverRoot.concat(
          '/',
          file.path
        );

        const result = await showDialog({
          title: `Schedule recurring execution for: ${file.name}`,
          body: new AddCronjob(),
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({ label: 'Schedule' })
          ],
          focusNodeSelector: 'input'
        });

        if (!result.button.accept) {
          return;
        }
        const dataToSend = {
          schedule: result.value,
          script: file.name,
          command: `papermill ${fullPath} /dev/null`
        };

        // Call scheduler API
        try {
          await requestAPI<any>('scheduler/add', {
            body: JSON.stringify(dataToSend),
            method: 'POST'
          });
        } catch (error) {
          console.warn(
            `Error while scheduling recurring executing for '${file.name}': ${error}`
          );

          showErrorMessage('An error occured', error);
        }
      }
    });

    // Add previous command to the context menu
    app.contextMenu.addItem({
      command: CommandIDs.addCron,
      selector: '.jp-DirListing-item[data-file-type="notebook"]'
      // rank: 0
    });

    // Add the command to the command palette
    const category = 'Extension Examples';
    palette.addItem({
      command: CommandIDs.show,
      category,
      args: { origin: 'from the palette' }
    });
    palette.addItem({
      command: CommandIDs.addCron,
      category,
      args: { origin: 'from the palette' }
    });

    // Create a menu
    const datavizMenu: Menu = new Menu({ commands });
    datavizMenu.title.label = 'MediaLab';
    mainMenu.addMenu(datavizMenu, { rank: 80 });

    // Add commands to the menu
    datavizMenu.addItem({ command: CommandIDs.show, args: { origin: 'menu' } });
  }
};

export default plugin;
