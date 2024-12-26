import 'module-alias/register';
import Application from "./app";
import container from './container';
import { SocketGameService } from './services';
container.resolve<Application>('Application')
container.resolve<SocketGameService>('SocketGameService')
