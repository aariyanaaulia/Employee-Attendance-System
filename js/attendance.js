
/* ==========================================
   EAMS - ATTENDANCE MANAGEMENT SYSTEM
   Add, Edit, Delete, Search and Filter
   Automatic Employee Dropdown Filtering
   24-Hour Time Format
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // 1. STORAGE
    // ==========================================

    const EMPLOYEE_KEY = "eamsEmployees";
    const ATTENDANCE_KEY = "eamsAttendance";

    let employees = JSON.parse(localStorage.getItem(EMPLOYEE_KEY)) || [];
    let attendanceRecords = JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];

    let currentPage = 1;
    const recordsPerPage = 10;

    let editingRecordId = null;

    const attendanceModalElement = document.getElementById("addAttendanceModal");
    const attendanceModal = new bootstrap.Modal(attendanceModalElement);

    const attendanceForm = document.getElementById("addAttendanceForm");
    const employeeDropdown = document.getElementById("newAttendanceEmployee");

    // ==========================================
    // 2. HELPER FUNCTIONS
    // ==========================================

    function getEmployeeID(employee) {
        return String(
            employee.employeeID ||
            employee.employeeId ||
            employee.id ||
            ""
        );
    }

    function getEmployeeName(employee) {
        return employee.name ||
            employee.employeeName ||
            "";
    }

    function getDepartment(employee) {
        return employee.department ||
            employee.departmentName ||
            "-";
    }

    function getTodayDate() {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(date) {
        if (!date) return "-";

        // Handle YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split("-");
            return `${day}/${month}/${year}`;
        }

        // Handle DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            return date;
        }

        return date;
    }

    function normalizeDate(date) {
        if (!date) return "";

        date = String(date);

        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }

        // Convert DD/MM/YYYY to YYYY-MM-DD
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
            const [day, month, year] = date.split("/");
            return `${year}-${month}-${day}`;
        }

        return date;
    }

    function formatTime(time) {
        if (!time || time === "-") return "-";

        // Keep time in 24-hour format
        const match = String(time).match(
            /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i
        );

        if (!match) return time;

        let hours = Number(match[1]);
        const minutes = match[2];
        const period = match[3];

        if (period) {
            if (period.toUpperCase() === "PM" && hours !== 12) {
                hours += 12;
            }

            if (period.toUpperCase() === "AM" && hours === 12) {
                hours = 0;
            }
        }

        return `${String(hours).padStart(2, "0")}:${minutes}`;
    }

    function saveAttendance() {
        localStorage.setItem(
            ATTENDANCE_KEY,
            JSON.stringify(attendanceRecords)
        );
    }

    function getRecordID(record) {
        return record.recordID || record.id || "";
    }

    function generateRecordID() {
        return "ATT-" + Date.now() + "-" +
            Math.random().toString(36).substring(2, 8);
    }

    function getEmployeeByID(id) {
        return employees.find(employee =>
            getEmployeeID(employee) === String(id)
        );
    }

    function getTodayRecords() {
        return attendanceRecords.filter(record =>
            normalizeDate(record.date) === getTodayDate()
        );
    }

    // ==========================================
    // 3. REMOVE EMPLOYEES WHO ALREADY
    //    HAVE ATTENDANCE TODAY
    // ==========================================

    function populateEmployeeDropdown() {

        // Reload latest attendance records
        attendanceRecords =
            JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];

        employeeDropdown.innerHTML = "";

        const defaultOption = document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent = "-- Select Employee --";

        employeeDropdown.appendChild(defaultOption);

        // Get all employee IDs who have attendance today
        const employeesAlreadyMarked = new Set(
            getTodayRecords().map(record =>
                String(record.employeeID || record.employeeId || "")
            )
        );

        // Show only employees who have NOT marked attendance today
        let availableEmployees = employees.filter(employee => {

            const employeeID = getEmployeeID(employee);

            return employeeID &&
                !employeesAlreadyMarked.has(employeeID);

        });

        // EDIT MODE: Keep the current employee available
        if (editingRecordId) {

            const editingRecord = attendanceRecords.find(record =>
                getRecordID(record) === editingRecordId
            );

            if (editingRecord) {

                const currentEmployeeID = String(
                    editingRecord.employeeID ||
                    editingRecord.employeeId ||
                    ""
                );

                const currentEmployee = getEmployeeByID(currentEmployeeID);

                if (
                    currentEmployee &&
                    !availableEmployees.some(employee =>
                        getEmployeeID(employee) === currentEmployeeID
                    )
                ) {
                    availableEmployees.push(currentEmployee);
                }
            }
        }

        availableEmployees.forEach(employee => {

            const option = document.createElement("option");

            const id = getEmployeeID(employee);
            const name = getEmployeeName(employee);

            option.value = id;
            option.textContent = `${id} - ${name}`;

            employeeDropdown.appendChild(option);

        });

        const message = document.getElementById(
            "employeeDropdownMessage"
        );

        if (message) {

            if (availableEmployees.length === 0) {
                message.textContent =
                    "All employees have already recorded attendance today.";

            } else {
                message.textContent =
                    `${availableEmployees.length} employee(s) available for attendance today.`;
            }
        }

        employeeDropdown.disabled = availableEmployees.length === 0;

    }

    // ==========================================
    // 4. DEPARTMENT FILTER
    // ==========================================

    function populateDepartmentFilter() {

        const departmentFilter =
            document.getElementById("departmentFilter");

        const currentValue = departmentFilter.value;

        departmentFilter.innerHTML =
            '<option value="">All Departments</option>';

        const departments = [
            ...new Set(
                employees.map(employee => getDepartment(employee))
                    .filter(department => department !== "-")
            )
        ];

        departments.forEach(department => {

            const option = document.createElement("option");

            option.value = department;
            option.textContent = department;

            departmentFilter.appendChild(option);

        });

        departmentFilter.value = currentValue;
    }

    // ==========================================
    // 5. ATTENDANCE STATISTICS
    // ==========================================

    function updateStatistics() {

        const todayRecords = getTodayRecords();

        const present = todayRecords.filter(record =>
            record.status.toLowerCase() === "present"
        ).length;

        const late = todayRecords.filter(record =>
            record.status.toLowerCase() === "late"
        ).length;

        const absent = todayRecords.filter(record =>
            record.status.toLowerCase() === "absent"
        ).length;

        // Employees without an attendance record today
        const recordedEmployees = new Set(
            todayRecords.map(record =>
                String(record.employeeID || record.employeeId || "")
            )
        );

        const notMarked = employees.filter(employee =>
            !recordedEmployees.has(getEmployeeID(employee))
        ).length;

        const totalAbsent = absent + notMarked;

        const totalEmployees = employees.length;

        const percentage = totalEmployees > 0
            ? Math.round(((present + late) / totalEmployees) * 100)
            : 0;

        document.getElementById("presentCount").textContent = present;

        document.getElementById("notCheckedIn").textContent =
            totalAbsent;

        document.getElementById("lateCount").textContent = late;

        document.getElementById("attendancePercentage").textContent =
            percentage + "%";

        document.getElementById("chartPercentage").textContent =
            percentage + "%";

        document.getElementById("chartPresent").textContent = present;

        document.getElementById("chartAbsent").textContent =
            totalAbsent;

        document.getElementById("chartLate").textContent = late;

        document.getElementById("chartDate").textContent =
            "Attendance overview for " +
            formatDate(getTodayDate());

        // Donut chart
        const donut = document.getElementById("attendanceDonut");

        const presentPercentage = totalEmployees
            ? (present / totalEmployees) * 100
            : 0;

        const latePercentage = totalEmployees
            ? (late / totalEmployees) * 100
            : 0;

        const absentPercentage = totalEmployees
            ? (totalAbsent / totalEmployees) * 100
            : 0;

        const presentEnd = presentPercentage;
        const lateEnd = presentEnd + latePercentage;

        donut.style.background = `
            conic-gradient(
                #819477 0% ${presentEnd}%,
                #E0AE52 ${presentEnd}% ${lateEnd}%,
                #BD766D ${lateEnd}% ${presentEnd + latePercentage + absentPercentage}%,
                #E9DDCA ${presentEnd + latePercentage + absentPercentage}% 100%
            )
        `;
    }

    // ==========================================
    // 6. RENDER ATTENDANCE TABLE
    // ==========================================

    function renderAttendanceTable() {

        const table = document.getElementById(
            "attendanceRecordsTable"
        );

        const search = document.getElementById(
            "attendanceSearch"
        ).value.toLowerCase();

        const department = document.getElementById(
            "departmentFilter"
        ).value;

        const status = document.getElementById(
            "statusFilter"
        ).value.toLowerCase();

        let filteredRecords = attendanceRecords.filter(record => {

            const employeeName =
                (record.employeeName || "").toLowerCase();

            const employeeID =
                String(record.employeeID || record.employeeId || "")
                    .toLowerCase();

            const recordDepartment =
                record.department || "-";

            const recordStatus =
                (record.status || "").toLowerCase();

            const matchesSearch =
                employeeName.includes(search) ||
                employeeID.includes(search);

            const matchesDepartment =
                !department ||
                recordDepartment === department;

            const matchesStatus =
                !status ||
                recordStatus === status;

            return matchesSearch &&
                matchesDepartment &&
                matchesStatus;

        });

        // Newest date first
        filteredRecords.sort((a, b) =>
            normalizeDate(b.date).localeCompare(normalizeDate(a.date))
        );

        const totalRecords = filteredRecords.length;

        const totalPages = Math.max(
            1,
            Math.ceil(totalRecords / recordsPerPage)
        );

        currentPage = Math.min(currentPage, totalPages);

        const startIndex = (currentPage - 1) * recordsPerPage;

        const pageRecords = filteredRecords.slice(
            startIndex,
            startIndex + recordsPerPage
        );

        table.innerHTML = "";

        if (pageRecords.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        No attendance records found.
                    </td>
                </tr>
            `;

        } else {

            pageRecords.forEach(record => {

                const statusClass =
                    (record.status || "").toLowerCase();

                const row = document.createElement("tr");

                const recordID = getRecordID(record);

                row.innerHTML = `
                    <td>${escapeHTML(record.employeeID || record.employeeId || "-")}</td>

                    <td>${escapeHTML(record.employeeName || "-")}</td>

                    <td>${escapeHTML(record.department || "-")}</td>

                    <td>${formatDate(normalizeDate(record.date))}</td>

                    <td>${formatTime(record.checkIn)}</td>

                    <td>${formatTime(record.checkOut)}</td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHTML(record.status || "-")}
                        </span>
                    </td>

                    <td>
                        <button
                            class="btn btn-sm btn-edit-attendance"
                            data-action="edit"
                            data-id="${escapeHTML(recordID)}">
                            Edit
                        </button>

                        <button
                            class="btn btn-sm btn-delete-attendance"
                            data-action="delete"
                            data-id="${escapeHTML(recordID)}">
                            Delete
                        </button>
                    </td>
                `;

                table.appendChild(row);

            });

        }

        document.getElementById("paginationInfo").textContent =
            totalRecords === 0
                ? "Showing 0 records"
                : `Showing ${startIndex + 1} - ${Math.min(
                    startIndex + recordsPerPage,
                    totalRecords
                )} of ${totalRecords} records`;

        document.getElementById("currentPage").textContent =
            `${currentPage} / ${totalPages}`;

        document.getElementById("previousPage").disabled =
            currentPage <= 1;

        document.getElementById("nextPage").disabled =
            currentPage >= totalPages;

    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    // ==========================================
    // 7. REFRESH ALL INFORMATION
    // ==========================================

    function refreshAttendance() {

        employees =
            JSON.parse(localStorage.getItem(EMPLOYEE_KEY)) || [];

        attendanceRecords =
            JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];

        // Assign IDs to older records that do not have one
        let changed = false;

        attendanceRecords.forEach(record => {

            if (!record.recordID && !record.id) {
                record.recordID = generateRecordID();
                changed = true;
            }

        });

        if (changed) {
            saveAttendance();
        }

        populateDepartmentFilter();
        updateStatistics();
        renderAttendanceTable();

        // IMPORTANT:
        // Refresh the dropdown after every attendance change
        populateEmployeeDropdown();
    }

    // ==========================================
    // 8. OPEN ADD ATTENDANCE MODAL
    // ==========================================

    document.querySelector(".btn-add-attendance")
        .addEventListener("click", function () {

            editingRecordId = null;

            attendanceForm.reset();

            document.getElementById("addAttendanceTitle")
                .textContent = "Add Attendance Record";

            document.getElementById("newAttendanceDate").value =
                formatDate(getTodayDate());

            document.getElementById("newAttendanceStatus").value =
                "Present";

            populateEmployeeDropdown();

        });

    // ==========================================
    // 9. SAVE / UPDATE ATTENDANCE
    // ==========================================

    attendanceForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const employeeID = employeeDropdown.value;

        const checkIn = formatTime(
            document.getElementById("newCheckIn").value
        );

        const checkOut = formatTime(
            document.getElementById("newCheckOut").value
        );

        const status = document.getElementById(
            "newAttendanceStatus"
        ).value;

        if (!employeeID) {
            alert("Please select an employee.");
            return;
        }

        // Reload latest data before checking duplicates
        attendanceRecords =
            JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];

        const selectedEmployee = getEmployeeByID(employeeID);

        if (!selectedEmployee) {
            alert("Employee not found.");
            return;
        }

        const attendanceDate = editingRecordId
            ? document.getElementById("newAttendanceDate").dataset.originalDate ||
              getTodayDate()
            : getTodayDate();

        // Check for duplicate attendance for the same employee and date
        const duplicate = attendanceRecords.some(record => {

            const sameEmployee = String(
                record.employeeID || record.employeeId || ""
            ) === employeeID;

            const sameDate =
                normalizeDate(record.date) === attendanceDate;

            const sameRecord =
                getRecordID(record) === editingRecordId;

            return sameEmployee && sameDate && !sameRecord;

        });

        if (duplicate) {
            alert(
                "This employee has already recorded attendance for this date."
            );
            return;
        }

        if (
            checkIn !== "-" &&
            checkOut !== "-" &&
            checkOut <= checkIn
        ) {
            alert("Check-out time must be later than check-in time.");
            return;
        }

        const attendanceData = {

            employeeID: employeeID,
            employeeId: employeeID,

            employeeName: getEmployeeName(selectedEmployee),

            department: getDepartment(selectedEmployee),

            position: selectedEmployee.position || "-",

            date: attendanceDate,

            checkIn: checkIn,
            checkOut: checkOut,

            status: status

        };

        // EDIT EXISTING RECORD
        if (editingRecordId) {

            const index = attendanceRecords.findIndex(record =>
                getRecordID(record) === editingRecordId
            );

            if (index !== -1) {

                attendanceRecords[index] = {
                    ...attendanceRecords[index],
                    ...attendanceData,
                    recordID: editingRecordId
                };

            }

        } else {

            // ADD NEW RECORD
            attendanceData.recordID = generateRecordID();

            attendanceRecords.push(attendanceData);

        }

        saveAttendance();

        attendanceModal.hide();

        attendanceForm.reset();

        editingRecordId = null;

        // Refresh table, statistics AND employee dropdown
        refreshAttendance();

        alert("Attendance record saved successfully!");

    });

    // ==========================================
    // 10. EDIT ATTENDANCE
    // ==========================================

    document.getElementById("attendanceRecordsTable")
        .addEventListener("click", function (event) {

            const button = event.target.closest("button");

            if (!button) return;

            const action = button.dataset.action;
            const recordID = button.dataset.id;

            attendanceRecords =
                JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || [];

            const record = attendanceRecords.find(item =>
                getRecordID(item) === recordID
            );

            if (!record) return;

            // EDIT
            if (action === "edit") {

                editingRecordId = recordID;

                attendanceForm.reset();

                document.getElementById("addAttendanceTitle")
                    .textContent = "Edit Attendance Record";

                // Include the current employee in edit mode
                populateEmployeeDropdown();

                employeeDropdown.value = String(
                    record.employeeID || record.employeeId
                );

                const recordDate = normalizeDate(record.date);

                document.getElementById("newAttendanceDate").value =
                    formatDate(recordDate);

                document.getElementById("newAttendanceDate")
                    .dataset.originalDate = recordDate;

                document.getElementById("newCheckIn").value =
                    formatTime(record.checkIn) === "-"
                        ? ""
                        : formatTime(record.checkIn);

                document.getElementById("newCheckOut").value =
                    formatTime(record.checkOut) === "-"
                        ? ""
                        : formatTime(record.checkOut);

                document.getElementById("newAttendanceStatus").value =
                    record.status || "Present";

                attendanceModal.show();

            }

            // DELETE
            if (action === "delete") {

                const confirmation = confirm(
                    `Are you sure you want to delete attendance for ${record.employeeName}?`
                );

                if (!confirmation) return;

                attendanceRecords = attendanceRecords.filter(item =>
                    getRecordID(item) !== recordID
                );

                saveAttendance();

                refreshAttendance();

                alert("Attendance record deleted successfully!");

            }

        });

    // ==========================================
    // 11. RESET MODAL AFTER CLOSING
    // ==========================================

    attendanceModalElement.addEventListener(
        "hidden.bs.modal",
        function () {

            editingRecordId = null;

            attendanceForm.reset();

            delete document.getElementById("newAttendanceDate")
                .dataset.originalDate;

            document.getElementById("addAttendanceTitle")
                .textContent = "Add Attendance Record";

            populateEmployeeDropdown();

        }
    );

    // ==========================================
    // 12. SEARCH
    // ==========================================

    document.getElementById("attendanceSearch")
        .addEventListener("input", function () {

            currentPage = 1;

            renderAttendanceTable();

        });

    // ==========================================
    // 13. FILTERS
    // ==========================================

    document.getElementById("departmentFilter")
        .addEventListener("change", function () {

            currentPage = 1;

            renderAttendanceTable();

        });

    document.getElementById("statusFilter")
        .addEventListener("change", function () {

            currentPage = 1;

            renderAttendanceTable();

        });

    // ==========================================
    // 14. PAGINATION
    // ==========================================

    document.getElementById("previousPage")
        .addEventListener("click", function () {

            if (currentPage > 1) {
                currentPage--;
                renderAttendanceTable();
            }

        });

    document.getElementById("nextPage")
        .addEventListener("click", function () {

            const totalRecords = attendanceRecords.length;

            const totalPages = Math.max(
                1,
                Math.ceil(totalRecords / recordsPerPage)
            );

            if (currentPage < totalPages) {
                currentPage++;
                renderAttendanceTable();
            }

        });

    // ==========================================
    // 15. EXPORT CSV
    // ==========================================

    document.getElementById("exportCsvBtn")
        .addEventListener("click", function () {

            if (attendanceRecords.length === 0) {
                alert("No attendance records to export.");
                return;
            }

            const headers = [
                "Employee ID",
                "Employee Name",
                "Department",
                "Date",
                "Check-in",
                "Check-out",
                "Status"
            ];

            const rows = attendanceRecords.map(record => [

                record.employeeID || record.employeeId || "-",

                record.employeeName || "-",

                record.department || "-",

                formatDate(normalizeDate(record.date)),

                formatTime(record.checkIn),

                formatTime(record.checkOut),

                record.status || "-"

            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(value =>
                    `"${String(value).replace(/"/g, '""')}"`
                ).join(","))
                .join("\n");

            const blob = new Blob(
                ["\uFEFF" + csv],
                { type: "text/csv;charset=utf-8;" }
            );

            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;
            link.download = "EAMS_Attendance_Records.csv";

            link.click();

            URL.revokeObjectURL(url);

        });

    // ==========================================
    // 16. PRINT RECORDS
    // ==========================================

    document.getElementById("printBtn")
        .addEventListener("click", function () {

            window.print();

        });

    // ==========================================
    // 17. INITIALIZE SYSTEM
    // ==========================================

    refreshAttendance();

});
