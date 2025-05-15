import { render } from 'preact';
import { ChatRoom } from './components/ChatRoom';
import './index.css';

render(<ChatRoom />, document.getElementById('app')!); 