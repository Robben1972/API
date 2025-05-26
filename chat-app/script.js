class ChatApp {
    constructor() {
        this.token = localStorage.getItem('access_token') || '';
        this.refreshToken = localStorage.getItem('refresh_token') || '';
        this.currentUserId = localStorage.getItem('user_id') || null; // Store authenticated user ID
        this.currentChat = null;
        this.socket = null;
        this.messagesDiv = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.fileInput = document.getElementById('file-input');
        this.searchInput = document.getElementById('search-input');
        this.userMap = new Map();
        this.isUsersLoaded = false;
        this.pendingMessages = [];
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.searchGroups());
        }
    }

    async fetchUsers() {
        try {
            const response = await fetch('http://localhost:8000/users/', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const users = await response.json();
            this.userMap.clear();
            users.forEach(user => this.userMap.set(user.id, user.username));
            console.log('userMap populated:', [...this.userMap.entries()]);
            this.isUsersLoaded = true;
            this.renderList('user-list', users, 'username', (username) => this.openChat(username));
            this.processPendingMessages();
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    async register() {
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();

        if (!username || !email || !password) {
            alert('Please fill all fields');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/users/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            if (!response.ok) throw new Error('Registration failed');
            const data = await response.json();
            this.token = data.access;
            this.refreshToken = data.refresh;
            this.currentUserId = data.user_id; // Save user ID
            localStorage.setItem('access_token', this.token);
            localStorage.setItem('refresh_token', this.refreshToken);
            localStorage.setItem('user_id', this.currentUserId); // Store user ID
            window.location.href = 'chat.html';
        } catch (error) {
            console.error('Error registering:', error);
            alert('Registration failed');
        }
    }

    async login() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();

        if (!email || !password) {
            alert('Please fill all fields');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/users/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) throw new Error('Login failed');
            const data = await response.json();
            this.token = data.access;
            this.refreshToken = data.refresh;
            this.currentUserId = data.user_id; // Save user ID
            localStorage.setItem('access_token', this.token);
            localStorage.setItem('refresh_token', this.refreshToken);
            localStorage.setItem('user_id', this.currentUserId); // Store user ID
            window.location.href = 'chat.html';
        } catch (error) {
            console.error('Error logging in:', error);
            alert('Login failed');
        }
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_id'); // Clear user ID
        window.location.href = 'index.html';
    }

    async loadData() {
        if (!this.token) {
            window.location.href = 'index.html';
            return;
        }
        await this.fetchUsers();
        await this.fetchGroups();
    }

    async fetchGroups() {
        try {
            const response = await fetch('http://localhost:8000/groups/', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch groups');
            const groups = await response.json();                                    
            this.renderGroups(groups);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    }

    async searchGroups() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.fetchGroups();
            return;
        }
        try {
            const response = await fetch(`http://localhost:8000/groups/search/?q=${query}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!response.ok) throw new Error('Failed to search groups');
            const groups = await response.json();
            this.renderGroups(groups);
        } catch (error) {
            console.error('Error searching groups:', error);
        }
    }

    renderList(listId, items, key, onClick) {
        const list = document.getElementById(listId);
        list.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item[key];
            li.onclick = () => onClick(item[key]);
            list.appendChild(li);
        });
    }

    renderGroups(groups) {
        const list = document.getElementById('group-list');
        list.innerHTML = '';
        groups.forEach(group => {
            const li = document.createElement('li');
            const subButton = ``;
            li.innerHTML = `${group.name} ${subButton}`;
            li.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') this.openChat(`group_${group.name}`);
            };
            list.appendChild(li);
        });
    }

    async createGroup() {
        const name = prompt('Enter group name:')?.trim();
        if (!name) return;
        try {
            const response = await fetch('http://localhost:8000/groups/create/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            if (!response.ok) throw new Error('Failed to create group');
            await this.fetchGroups();
        } catch (error) {
            console.error('Error creating group:', error);
        }
    }

    async toggleSubscription(groupId, button) {
        const subscribed = button.textContent === 'Subscribe';
        const url = `http://localhost:8000/groups/${groupId}/${subscribed ? 'subscribe' : 'unsubscribe'}/`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!response.ok) throw new Error('Failed to toggle subscription');
            await this.fetchGroups();
        } catch (error) {
            console.error('Error toggling subscription:', error);
        }
    }

    async fetchChatHistory(roomName) {
        try {
            const isGroup = roomName.startsWith('group_');
            const endpoint = isGroup 
                ? `http://localhost:8000/groups/group/history/${roomName}/`
                : `http://localhost:8000/groups/chat/history/${roomName}/`;

            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch ${isGroup ? 'group' : 'chat'} history`);
            const history = await response.json();
            console.log('Chat history:', history);

            const historyDiv = document.getElementById('chat-history');
            historyDiv.innerHTML = '';
            history.forEach(msg => {
                const message = document.createElement('div');
                const senderId = msg.sender_id || msg.sender;
                const isSentByCurrentUser = Number.isInteger(Number(senderId)) 
                    ? Number(senderId) === Number(this.currentUserId)
                    : senderId === this.currentUserId;
                message.className = `message ${isSentByCurrentUser ? 'sent' : 'received'}`;
                const senderName = Number.isInteger(Number(senderId)) 
                    ? (this.userMap.get(Number(senderId)) || msg.sender_name || 'Unknown')
                    : (senderId || msg.sender_name || 'Unknown');
                if (Number.isInteger(Number(senderId)) && !this.userMap.has(Number(senderId))) {
                    console.warn(`Sender ID ${senderId} not found in userMap`);
                }
                let content = `${senderName}: ${msg.content || '[No content]'}`;
                if (msg.files) {
                    const ext = msg.files.split('.').pop().toLowerCase();
                    const fileUrl = `http://localhost:8000${msg.files}`;
                    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                        content += `<br><img src="${fileUrl}" alt="attachment" style="max-width: 200px;">`;
                    } else {
                        content += `<br><a href="${fileUrl}" target="_blank">Download attachment</a>`;
                    }
                }
                message.innerHTML = content;
                historyDiv.appendChild(message);
            });
            historyDiv.classList.remove('hidden');
        } catch (error) {
            console.error(`Error fetching ${roomName.startsWith('group_') ? 'group' : 'chat'} history:`, error);
        }
    }

    async openChat(roomName) {
        if (!this.isUsersLoaded) {
            await this.fetchUsers();
        }
        if (this.socket) this.socket.close();
        this.currentChat = roomName;
        document.getElementById('chat-title').textContent = `Chat: ${roomName.replace('group_', '')}`;
        this.messagesDiv.innerHTML = '';
        
        await this.fetchChatHistory(roomName);

        const wsUrl = `ws://localhost:8000/ws/chat/${roomName}/?token=${this.token}`;
        this.socket = new WebSocket(wsUrl);
        console.log(wsUrl);
        

        this.socket.onopen = () => console.log('WebSocket connection established');
        this.socket.onmessage = (e) => this.handleMessage(e);
        this.socket.onerror = (e) => console.error('WebSocket error:', e);
        this.socket.onclose = (e) => console.log('WebSocket closed:', e);
    }

    processPendingMessages() {
        while (this.pendingMessages.length > 0) {
            const event = this.pendingMessages.shift();
            this.handleMessage(event);
        }
    }

    handleMessage(event) {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        if (!this.isUsersLoaded) {
            this.pendingMessages.push(event);
            console.log('Queued message, waiting for userMap');
            return;
        }

        const message = document.createElement('div');
        const senderId = data.sender_id || data.sender;
        const isSentByCurrentUser = Number.isInteger(Number(senderId)) 
            ? Number(senderId) === Number(this.currentUserId)
            : senderId === this.currentUserId;
        message.className = `message ${isSentByCurrentUser ? 'sent' : 'received'}`;
        const senderName = Number.isInteger(Number(senderId)) 
            ? (this.userMap.get(Number(senderId)) || data.sender_name || 'Unknown')
            : (senderId || data.sender_name || 'Unknown');
        if (Number.isInteger(Number(senderId)) && !this.userMap.has(Number(senderId))) {
            console.warn(`Sender ID ${senderId} not found in userMap`);
        }
        let content = `${senderName}: ${data.message || data.content || '[No content]'}`;
        if (data.files || data.file_url) {
            const fileUrl = data.files || data.file_url;
            const ext = fileUrl.split('.').pop().toLowerCase();
            const fullUrl = `http://localhost:8000${fileUrl}`;
            if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                content += `<br><img src="${fullUrl}" alt="attachment" style="max-width: 200px;">`;
            } else {
                content += `<br><a href="${fullUrl}" target="_blank">Download attachment</a>`;
            }
        }
        
        message.innerHTML = content;
        this.messagesDiv.appendChild(message);
        this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }

    async sendMessage() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected');
            return;
        }

        const message = this.messageInput.value.trim();
        const file = this.fileInput.files[0];

        if (!message && !file) {
            console.log('No message or file to send');
            return;
        }

        if (message && !file) {
            const messageData = { 
                message: message,
                type: 'text'
            };
            this.socket.send(JSON.stringify(messageData));
            this.messageInput.value = '';
            return;
        }

        if (file) {
            try {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Data = reader.result.split(',')[1];
                    const fileData = {
                        type: 'file',
                        message: message || '',
                        filename: file.name,
                        filetype: file.type,
                        filedata: base64Data
                    };
                    this.socket.send(JSON.stringify(fileData));
                    this.messageInput.value = '';
                    this.fileInput.value = '';
                };
                reader.onerror = (error) => console.error('Error reading file:', error);
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error processing file:', error);
            }
        }
    }
}

const chatApp = new ChatApp();

window.login = () => chatApp.login();
window.register = () => chatApp.register();
window.logout = () => chatApp.logout();
window.sendMessage = () => chatApp.sendMessage();
window.createGroup = () => chatApp.createGroup();
window.toggleSubscription = (groupId, button) => chatApp.toggleSubscription(groupId, button);

if (window.location.pathname.includes('chat.html')) {
    chatApp.loadData();
}

window.showRegister = () => {
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('register-box').classList.remove('hidden');
};

window.showLogin = () => {
    document.getElementById('register-box').classList.add('hidden');
    document.getElementById('login-box').classList.remove('hidden');
};