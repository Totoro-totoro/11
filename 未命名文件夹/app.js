let categories = []; // 将 categories 移到全局作用域
let tinyMCEInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    const addCategoryBtn = document.getElementById('addCategory');
    const newCategoryForm = document.getElementById('newCategoryForm');
    const newCategoryName = document.getElementById('newCategoryName');
    const submitNewCategory = document.getElementById('submitNewCategory');
    const cancelNewCategory = document.getElementById('cancelNewCategory');

    let entries = JSON.parse(localStorage.getItem('entries')) || [];
    categories = JSON.parse(localStorage.getItem('categories')) || [
        { id: 1, name: '组件', parentId: null, content: '组件内容' },
        { id: 2, name: 'B端网站', parentId: null },
        { id: 3, name: 'AI', parentId: null }
    ];

    addCategoryBtn.addEventListener('click', showNewCategoryForm);
    submitNewCategory.addEventListener('click', addTopLevelCategory);
    cancelNewCategory.addEventListener('click', hideNewCategoryForm);

    const editButton = document.getElementById('editButton');
    const saveButton = document.getElementById('saveButton');
    const cancelButton = document.getElementById('cancelButton');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');

    editButton.addEventListener('click', enableEditing);
    saveButton.addEventListener('click', saveEdits);
    cancelButton.addEventListener('click', cancelEdits);
    uploadButton.addEventListener('click', uploadFile);

    let currentCategory = null;

    function updateTreeNav() {
        const treeNav = document.getElementById('treeNav');
        treeNav.innerHTML = buildCategoryTree(null);
        addDragAndDropListeners();
    }

    function buildCategoryTree(parentId) {
        let treeHTML = '<ul>';
        const childCategories = categories.filter(cat => cat.parentId === parentId);
        
        childCategories.forEach(category => {
            const hasChildren = categories.some(cat => cat.parentId === category.id);
            treeHTML += `
                <li class="category-item" id="category-${category.id}" draggable="true">
                    <div class="category-header">
                        <span class="toggle-icon ${hasChildren ? '' : 'hidden'}" onclick="toggleSubcategories(${category.id})">
                            <i class="fas fa-caret-right"></i>
                        </span>
                        <span class="category-name" data-category-id="${category.id}" title="${category.name}">${category.name}</span>
                        <div class="category-menu">
                            <span class="ellipsis-icon" onclick="toggleCategoryMenu(${category.id}, event)">
                                <i class="fas fa-ellipsis-v"></i>
                            </span>
                            <div id="categoryMenu${category.id}" class="category-menu-content">
                                <button onclick="editCategory(${category.id})">编辑</button>
                                <button onclick="addSubcategory(${category.id})">添加子分类</button>
                                <button onclick="deleteCategory(${category.id})">删除</button>
                            </div>
                        </div>
                    </div>
                    ${hasChildren ? `<div class="subcategories">${buildCategoryTree(category.id)}</div>` : ''}
                </li>
            `;
        });
        
        treeHTML += '</ul>';
        return childCategories.length > 0 ? treeHTML : '';
    }

    function addDragAndDropListeners() {
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('dragstart', dragStart);
            item.addEventListener('dragend', dragEnd);
            item.addEventListener('dragover', dragOver);
            item.addEventListener('dragenter', dragEnter);
            item.addEventListener('dragleave', dragLeave);
            item.addEventListener('drop', drop);
        });
    }

    function dragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }

    function dragEnd(e) {
        e.target.classList.remove('dragging');
    }

    function dragOver(e) {
        e.preventDefault();
        e.target.closest('.category-item').classList.add('drag-over');
    }

    function dragEnter(e) {
        e.preventDefault();
        e.target.closest('.category-item').classList.add('drag-over');
    }

    function dragLeave(e) {
        e.target.closest('.category-item').classList.remove('drag-over');
    }

    function drop(e) {
        e.preventDefault();
        const draggedItemId = e.dataTransfer.getData('text');
        const draggedItem = document.getElementById(draggedItemId);
        const dropTarget = e.target.closest('.category-item');

        dropTarget.classList.remove('drag-over');

        if (dropTarget && draggedItem !== dropTarget) {
            const draggedCategoryId = parseInt(draggedItem.id.split('-')[1]);
            const targetCategoryId = parseInt(dropTarget.id.split('-')[1]);

            // 更新分类顺序
            const draggedCategory = categories.find(cat => cat.id === draggedCategoryId);
            const targetCategory = categories.find(cat => cat.id === targetCategoryId);

            if (draggedCategory && targetCategory) {
                // 如果目标是子分类，将拖动的分类移动到子分类列表中
                if (targetCategory.parentId !== null) {
                    draggedCategory.parentId = targetCategory.parentId;
                } else {
                    draggedCategory.parentId = null;
                }

                // 重新排序分类
                const parentCategories = categories.filter(cat => cat.parentId === targetCategory.parentId);
                const targetIndex = parentCategories.indexOf(targetCategory);
                const draggedIndex = parentCategories.indexOf(draggedCategory);

                if (draggedIndex !== -1) {
                    parentCategories.splice(draggedIndex, 1);
                }
                parentCategories.splice(targetIndex, 0, draggedCategory);

                // 更新分类顺序
                parentCategories.forEach((cat, index) => {
                    cat.order = index;
                });

                saveCategoriesAndUpdateNav();
            }
        }
    }

    function selectCategory(categoryId) {
        // 移除之前选中的分类的高亮
        const previouslySelected = document.querySelector('.category-item.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }

        // 高亮当前选中的分类
        const selectedCategory = document.getElementById(`category-${categoryId}`);
        if (selectedCategory) {
            selectedCategory.classList.add('selected');
        }

        // 显示选中分类的内容
        showCategoryContent(categoryId);
    }

    function showCategoryContent(categoryId) {
        currentCategory = categories.find(cat => cat.id === categoryId);
        if (currentCategory) {
            const contentTitle = document.getElementById('contentTitle');
            const categoryContent = document.getElementById('categoryContent');
            const editActions = document.getElementById('editActions');
            const uploadButton = document.getElementById('uploadButton');
            
            contentTitle.textContent = currentCategory.name;
            
            let filesHTML = '';
            if (currentCategory.files && currentCategory.files.length > 0) {
                filesHTML = '<h3>上传的文件</h3><ul>';
                currentCategory.files.forEach(file => {
                    filesHTML += `<li>${file.name} (${file.type})</li>`;
                });
                filesHTML += '</ul>';
            }
            categoryContent.innerHTML = `
                <div id="categoryText">${currentCategory.content || '<p>该分类暂无内容。</p>'}</div>
                ${filesHTML}
            `;
            editActions.innerHTML = '<button id="editButton">编辑</button>';
            document.getElementById('editButton').addEventListener('click', enableEditing);
            uploadButton.style.display = 'inline-block';
            document.getElementById('fileUpload').style.display = 'none';

            // 如果存在 TinyMCE 实例，先移除它
            if (tinyMCEInstance) {
                tinymce.remove('#categoryText');
                tinyMCEInstance = null;
            }
        }
    }

    function showNewCategoryForm() {
        newCategoryForm.style.display = 'block';
        newCategoryName.focus();
    }

    function hideNewCategoryForm() {
        newCategoryForm.style.display = 'none';
        newCategoryName.value = '';
    }

    function addTopLevelCategory() {
        const name = newCategoryName.value.trim();
        if (name) {
            const newCategory = {
                id: Date.now(),
                name: name,
                parentId: null,
                content: ''
            };
            categories.unshift(newCategory); // 添加到组的开头
            saveCategoriesAndUpdateNav();
            selectCategory(newCategory.id);
            hideNewCategoryForm();
        }
    }

    function addSubcategory(parentId) {
        const name = prompt('请输入子分类名称:');
        if (name) {
            const newCategory = {
                id: Date.now(),
                name: name,
                parentId: parentId,
                content: ''
            };
            categories.push(newCategory);
            saveCategoriesAndUpdateNav();
            
            // 展开父分类
            const parentElement = document.getElementById(`category-${parentId}`);
            const toggleIcon = parentElement.querySelector('.toggle-icon i');
            const subcategoriesElement = parentElement.querySelector('.subcategories');
            if (subcategoriesElement) {
                subcategoriesElement.classList.remove('hidden');
                toggleIcon.classList.remove('fa-caret-right');
                toggleIcon.classList.add('fa-caret-down');
            }
            
            selectCategory(newCategory.id);
        }
    }

    function editCategory(categoryId) {
        const categoryElement = document.querySelector(`#category-${categoryId} .category-name`);
        categoryElement.contentEditable = true;
        categoryElement.focus();

        // 保存原始名称，以便取消编辑时恢复
        const originalName = categoryElement.textContent;

        // 添加保存和取消按钮
        const actionButtons = document.createElement('div');
        actionButtons.className = 'edit-actions';
        actionButtons.innerHTML = `
            <button class="save-edit">保存</button>
            <button class="cancel-edit">取消</button>
        `;
        categoryElement.parentNode.insertBefore(actionButtons, categoryElement.nextSibling);

        // 保存编辑
        actionButtons.querySelector('.save-edit').addEventListener('click', () => {
            const newName = categoryElement.textContent.trim();
            if (newName && newName !== originalName) {
                const category = categories.find(cat => cat.id === categoryId);
                if (category) {
                    category.name = newName;
                    saveCategoriesAndUpdateNav();
                }
            }
            finishEditing(categoryElement, actionButtons);
        });

        // 取消编辑
        actionButtons.querySelector('.cancel-edit').addEventListener('click', () => {
            categoryElement.textContent = originalName;
            finishEditing(categoryElement, actionButtons);
        });

        // 按下回车键保存编辑
        categoryElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                actionButtons.querySelector('.save-edit').click();
            }
        });
    }

    function deleteCategory(categoryId) {
        if (confirm('确定要删除这个分类吗？相关的子分类也会被删除。')) {
            categories = categories.filter(cat => cat.id !== categoryId && cat.parentId !== categoryId);
            saveCategoriesAndUpdateNav();
        }
    }

    function saveCategoriesAndUpdateNav() {
        localStorage.setItem('categories', JSON.stringify(categories));
        updateTreeNav();
    }

    function showCategory(categoryId) {
        const category = categories.find(cat => cat.id === categoryId);
        if (category) {
            const categoryEntries = entries.filter(entry => entry.categoryId === categoryId);
            let entriesHTML = `<h2>${category.name}</h2>`;
            if (categoryEntries.length === 0) {
                entriesHTML += '<p>该分类下暂无条目。</p>';
            } else {
                categoryEntries.forEach(entry => {
                    entriesHTML += `
                        <div class="entry">
                            <h3>${entry.title}</h3>
                            <p>${entry.versions[0].content.substring(0, 100)}...</p>
                            <button onclick="showEntry(${entry.id})">查看详情</button>
                        </div>
                    `;
                });
            }
            mainContent.innerHTML = entriesHTML;
        }
    }

    function enableEditing() {
        const categoryText = document.getElementById('categoryText');
        initTinyMCE(categoryText);
        const editActions = document.getElementById('editActions');
        editActions.innerHTML = `
            <button id="saveButton">保存</button>
            <button id="cancelButton">取消</button>
        `;
        document.getElementById('saveButton').addEventListener('click', saveEdits);
        document.getElementById('cancelButton').addEventListener('click', cancelEdits);
    }

    function saveEdits() {
        if (tinyMCEInstance) {
            currentCategory.content = tinyMCEInstance.getContent();
            tinymce.remove('#categoryText');
            tinyMCEInstance = null;
        }
        showCategoryContent(currentCategory.id);
        saveCategoriesAndUpdateNav();
    }

    function cancelEdits() {
        if (tinyMCEInstance) {
            tinymce.remove('#categoryText');
            tinyMCEInstance = null;
        }
        showCategoryContent(currentCategory.id);
    }

    function uploadFile() {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileContent = e.target.result;
                const fileInfo = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: fileContent
                };
                if (!currentCategory.files) {
                    currentCategory.files = [];
                }
                currentCategory.files.push(fileInfo);
                saveCategoriesAndUpdateNav();
                showCategoryContent(currentCategory.id);
                alert('文件上传成功！');
            };
            reader.readAsDataURL(file);
        } else {
            alert('请选择一个文件。');
        }
    }

    // 初始化时更新树形导航、展开所有分类并添加拖放监听器
    updateTreeNav();
    expandAllCategories();
    addDragAndDropListeners();

    // 默认选中第一个分类
    if (categories.length > 0) {
        selectCategory(categories[0].id);
    }

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const logoutButton = document.getElementById('logoutButton');

    searchButton.addEventListener('click', performSearch);
    logoutButton.addEventListener('click', logout);

    function performSearch() {
        const query = searchInput.value.toLowerCase();
        // 实现搜索逻辑
        console.log('Searching for:', query);
        // 这里你可以实现新的搜索逻辑
    }

    function logout() {
        // 实现退出登录逻辑
        console.log('Logging out');
        // 这你可以清除用户会话,重定向到登录页面等
    }

    // 添加对树形导航点的委托处理
    document.getElementById('treeNav').addEventListener('click', (event) => {
        const categoryName = event.target.closest('.category-name');
        if (categoryName) {
            const categoryId = parseInt(categoryName.getAttribute('data-category-id'));
            selectCategory(categoryId);
        }
    });

    function toggleSubcategories(categoryId) {
        const categoryElement = document.getElementById(`category-${categoryId}`);
        const toggleIcon = categoryElement.querySelector('.toggle-icon i');
        const subcategoriesElement = categoryElement.querySelector('ul');

        if (subcategoriesElement) {
            subcategoriesElement.classList.toggle('hidden');
            toggleIcon.classList.toggle('fa-caret-right');
            toggleIcon.classList.toggle('fa-caret-down');
        }
    }

    // 初始化时展开所有分类
    function expandAllCategories() {
        const toggleIcons = document.querySelectorAll('.toggle-icon');
        toggleIcons.forEach(icon => {
            icon.querySelector('i').classList.remove('fa-caret-right');
            icon.querySelector('i').classList.add('fa-caret-down');
        });
    }

    function toggleCategoryMenu(categoryId, event) {
        event.stopPropagation(); // 阻止事件冒泡
        const menu = document.getElementById(`categoryMenu${categoryId}`);
        menu.classList.toggle('show');
        
        // 点击其他地方时关闭菜单
        document.addEventListener('click', function closeMenu(e) {
            if (!e.target.matches('.ellipsis-icon') && !e.target.matches('.fa-ellipsis-v')) {
                menu.classList.remove('show');
                document.removeEventListener('click', closeMenu);
            }
        });
    }

    // 将这些函数放在全局作用域
    window.editCategory = editCategory;
    window.addSubcategory = addSubcategory;
    window.deleteCategory = deleteCategory;
    window.toggleCategoryMenu = toggleCategoryMenu;
    window.toggleSubcategories = toggleSubcategories;

    function finishEditing(element, actionsElement) {
        element.contentEditable = false;
        actionsElement.remove();
    }

    function initTinyMCE(element) {
        tinymce.init({
            target: element,
            height: 500,
            menubar: false,
            plugins: [
                'advlist autolink lists link image charmap print preview anchor',
                'searchreplace visualblocks code fullscreen',
                'insertdatetime media table paste code help wordcount'
            ],
            toolbar: 'undo redo | formatselect | ' +
            'bold italic backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            setup: function(editor) {
                tinyMCEInstance = editor;
            }
        });
    }
});