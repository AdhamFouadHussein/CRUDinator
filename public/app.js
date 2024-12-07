const API_URL = '/api';
let authToken = localStorage.getItem('authToken') || '';
let schemaFields = [];
let schemas = [];

document.addEventListener('DOMContentLoaded', async function () {
    const app = document.getElementById('app');
    app.innerHTML = `
    <h1>Management System</h1>
    <div id="login-container">
      <form id="login-form">
        <input class="form-control" type="text" id="username" placeholder="Username" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>
    </div>
    <div id="admin-container" style="display: none;">
      <div id="notification" class="notification"></div>
      <form id="schema-form">
        <input class="form-control" type="text" id="schema-name" placeholder="Schema Name" required>
        <div id="fields-container"></div>
        <button type="button" id="add-field-btn" class="btn btn-success lbtn">Add Field</button>
        <button type="submit" class="btn btn-primary" style="margin-left: 20px; margin-right: 20px">Save Schema</button>
      </form>
      <div id="tabs-container">
        <ul id="tabs-list"></ul>
        <div id="tab-content"></div>
      </div>
    </div>
  `;

    async function verifyToken() {
        if (!authToken) return false;
        try {
            const response = await fetch(`${API_URL}/auth/verify-token`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();
            return data.valid;
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    }

    if (await verifyToken()) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('admin-container').style.display = 'block';
        await loadSchemas();
        loadTabs();
    }

    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        setTimeout(() => notification.style.display = 'none', 3000);
    }

    async function loadSchemas() {
        try {
            const response = await fetch(`${API_URL}/db/schema`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            schemas = await response.json();
        } catch (error) {
            console.error('Failed to load schemas:', error);
        }
    }

    function loadTabs() {
        const tabsList = document.getElementById('tabs-list');
        const tabContent = document.getElementById('tab-content');
        tabsList.innerHTML = '';
        tabContent.innerHTML = '';

        const uniqueSchemas = Array.from(new Set(schemas.map(schema => schema.schemaName)));

        uniqueSchemas.forEach(schemaName => {
            const tab = document.createElement('li');
            tab.textContent = schemaName;
            tab.onclick = () => loadSchemaData(schemaName);
            tabsList.appendChild(tab);
        });

        if (uniqueSchemas.length > 0) {
            loadSchemaData(uniqueSchemas[0]);
        }
    }

    async function loadSchemaData(schemaName) {
        try {
            const response = await fetch(`${API_URL}/db/schema?${schemaName}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();
            console.log('Loaded schema fields:', data);
            schemaFields = data;

            let documents = [];
            try {
                const documentsResponse = await fetch(`${API_URL}/db/${schemaName}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                documents = await documentsResponse.json();
                console.log('Loaded documents:', documents);
            } catch (error) {
                console.warn('No documents found for schema:', schemaName);
            }

            renderTable(schemaName, data, documents);
        } catch (error) {
            console.error('Failed to load schema data:', error);
        }
    }

    function renderTable(schemaName, fields, documents) {
        console.log('Schema data:', schemaName, fields);
        const tabContent = document.getElementById('tab-content');
        const fieldsToRender = fields.filter(field => field.schemaName === schemaName);
        
        tabContent.innerHTML = `
        <style>
            .table-container {
                overflow-x: auto;
            }
            .table thead th {
                vertical-align: middle;
                text-align: center;
            }
            .table tbody td {
                vertical-align: middle;
                text-align: center;
            }
        </style>
        <ul class="nav nav-tabs mb-3">
            <li class="nav-item">
                <a class="nav-link active" href="#${schemaName}-form" data-bs-toggle="tab">Add ${schemaName}</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#${schemaName}-table" data-bs-toggle="tab">${schemaName} List</a>
            </li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane fade show active" id="${schemaName}-form">
                <form id="ticket-form">
                    ${fieldsToRender.map(field => `
                        <input type="${field.type || 'text'}" 
                            class="form-control mb-2" 
                            id="custom_${field.name}"
                            name="${field.name}"
                            placeholder="${field.name}"
                            ${field.required ? 'required' : ''}>
                    `).join('')}
                    <button type="submit" class="btn btn-success lbtn">Save</button>
                    <button type="button" class="btn" id="update-btn" style="display: none;">Update</button>
                </form>
            </div>
            <div class="tab-pane fade" id="${schemaName}-table">
                <div class="table-container">
                    <table id="table-${schemaName}" class="table table-striped-columns">
                        <thead> 
                            <tr>
                                ${fieldsToRender.map(field => `<th>${field.name}</th>`).join('')}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${documents.map(doc => `
                                <tr>
                                    ${fieldsToRender.map(field => `<td>${doc[field.name] || ''}</td>`).join('')}
                                    <td>
                                        <button onclick="editRow('${doc._id}', '${schemaName}')" class="btn btn-secondary">Edit</button>
                                        <button onclick="deleteRow('${doc._id}', '${schemaName}')" class="btn btn-danger">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      `;

        const ticketForm = document.getElementById('ticket-form');
        ticketForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const customFieldsData = {};
            
            fieldsToRender.forEach(field => {
                const inputElement = document.getElementById(`custom_${field.name}`);
                if (inputElement && inputElement.value) {
                    customFieldsData[field.name] = inputElement.value;
                }
            });
        
            if (Object.keys(customFieldsData).length === 0) {
                showNotification('Please fill in at least one field', 'error');
                return;
            }
        
            try {
                console.log('Creating ' + schemaName + ' with data:', customFieldsData);
                const response = await fetch(`${API_URL}/db`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        schemaName,
                        customFields: customFieldsData
                    })
                });
                const responseData = await response.json();
        
                if (responseData.error) {
                    showNotification(responseData.error, 'error');
                    return;
                }
        
                showNotification(`${schemaName} created successfully!`, 'success');
                loadSchemaData(schemaName);
                ticketForm.reset();
            } catch (error) {
                console.error(`Error creating ${schemaName}:`, error);
                showNotification(`Failed to create ${schemaName}`, 'error');
            }
        });

        document.getElementById('update-btn').addEventListener('click', async function () {
            const customFieldsData = {};
            schemaFields.forEach(field => {
                const value = document.getElementById(`custom_${field.name}`).value;
                if (value) customFieldsData[field.name] = value;
            });

            try {
                const response = await fetch(`${API_URL}/db/${schemaName}/${this.dataset.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        customFields: customFieldsData
                    })
                });
                const responseData = await response.json();

                if (responseData.error) {
                    showNotification(responseData.error, 'error');
                    return;
                }

                showNotification(schemaName + '  updated successfully!', 'success');
                loadSchemaData(schemaName);
                ticketForm.reset();
                document.getElementById('update-btn').style.display = 'none';
            } catch (error) {
                console.error('Error updating ${schemaName}:', error);
                showNotification('Failed to update ${schemaName}', 'error');
            }
        });
    }

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                })
            });
            const data = await response.json();

            if (data.token) {
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                document.getElementById('login-container').style.display = 'none';
                document.getElementById('admin-container').style.display = 'block';
                await loadSchemas();
                loadTabs();
            } else {
                alert('Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed');
        }
    });

    const schemaForm = document.getElementById('schema-form');
    const fieldsContainer = document.getElementById('fields-container');
    const addFieldBtn = document.getElementById('add-field-btn');

    addFieldBtn.addEventListener('click', () => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'field-item';
        fieldDiv.innerHTML = `
            <input class="form-control" type="text" placeholder="Field Name" required>
            <select  class="form-select">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
                <option value="email">Email</option>
            </select>
            <label>
                <input type="checkbox" class="form-check-input"> Required
            </label>
            <button type="button" class="remove-field-btn btn btn-danger" style="margin-top:10px;">Remove</button>
        `;
        fieldsContainer.appendChild(fieldDiv);

        fieldDiv.querySelector('.remove-field-btn').addEventListener('click', () => {
            fieldsContainer.removeChild(fieldDiv);
        });
    });

    schemaForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const schemaName = document.getElementById('schema-name').value;
        const fields = Array.from(fieldsContainer.children).map(fieldDiv => {
            const [nameInput, typeSelect, requiredCheckbox] = fieldDiv.querySelectorAll('input, select');
            return {
                schemaName,
                name: nameInput.value,
                type: typeSelect.value,
                required: requiredCheckbox.checked
            };
        });

        console.log('Submitting schema:', {
            schemaName,
            fields
        }); // Debugging statement

        try {
            const response = await fetch(`${API_URL}/db/schema`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(fields)
            });
            const data = await response.json();

            if (data.error) {
                showNotification(data.error, 'error');
                return;
            }

            showNotification('Schema saved successfully!', 'success');
            schemaForm.reset();
            fieldsContainer.innerHTML = '';
            schemaFields = fields;
            await loadSchemas();
            loadTabs();
        } catch (error) {
            console.error('Error saving schema:', error);
            showNotification('Failed to save schema', 'error');
        }
    });
    window.editRow = async function (_id, schemaName) {
        try {
            const response = await fetch(`${API_URL}/db/${schemaName}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const documents = await response.json();
            const doc = documents.find(doc => doc._id === _id);

            if (doc) {
                console.log('Editing document:', doc);
                console.log('Schema fields:', schemaFields);
                schemaFields.forEach(field => {
                    const inputElement = document.getElementById(`custom_${field.name}`);
                    if (inputElement) {
                        inputElement.value = doc[field.name] || '';
                        console.log('Setting value for field:', field.name, inputElement.value);
                    } else {
                        console.log('Field not found:', field.name);
                    }
                });

                const updateBtn = document.getElementById('update-btn');
                updateBtn.style.display = 'block';
                updateBtn.dataset.id = _id;
            }
        } catch (error) {
            console.error('Error loading ticket for edit:', error);
        }
    };
    //delete row from a schema
    window.deleteRow = async function (_id, schemaName) {
        try {
            //show confirmation dialog
            if (!confirm('Are you sure you want to delete this ' + schemaName + '?')) {
                return;
            }
            console.log('Deleting ' + schemaName + '  with ID:', _id);
            const response = await fetch(`${API_URL}/db/${schemaName}/${_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();

            if (data.error) {
                showNotification(data.error, 'error');
                return;
            }

            showNotification(schemaName + ' deleted successfully!', 'success');
            loadSchemaData(schemaName);
        } catch (error) {
            console.error('Error deleting ${schemaName}:', error);
        }
    };
});
