/**
 * 나무발발이 현장 관리 달력 로직
 * (PC-모바일 실시간 연동을 위해 서버 API를 사용하도록 구현했습니다)
 */

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const modal = document.getElementById('eventModal');
    const closeBtn = document.querySelector('.close');
    const form = document.getElementById('eventForm');
    const deleteBtn = document.getElementById('deleteBtn');

    // 1. 달력 초기화
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        height: 'auto',
        selectable: true,
        editable: true,
        dayMaxEvents: true,
        
        select: function(info) {
            openModal(null, info.startStr, info.endStr);
        },

        eventClick: function(info) {
            openModal(info.event);
        }
    });

    calendar.render();

    // 2. 데이터 불러오기 (서버 API 사용)
    async function loadEvents(isAutoRefresh = false) {
        const statusEl = document.getElementById('connection-status');
        try {
            const response = await fetch('/api/events');
            if (!response.ok) throw new Error('서버 응답 오류');
            const events = await response.json();
            
            if (statusEl) {
                statusEl.innerText = "● 서버 연결됨 (실시간 연동 중)";
                statusEl.className = "status-online";
            }

            // 실시간 연동을 위해: 데이터가 바뀌었을 때만 업데이트 (깜빡임 방지)
            const currentEvents = calendar.getEvents();
            
            // 단순하게 매번 갱신하되, API 결과가 배열인 경우에만 처리
            if (Array.isArray(events)) {
                calendar.removeAllEvents();
                calendar.addEventSource(events);
                updateAutocomplete(events);
            }
        } catch (err) {
            console.error("데이터 로딩 실패:", err);
            if (statusEl) {
                statusEl.innerText = "○ 서버 연결 끊김";
                statusEl.className = "status-offline";
            }
            if (!isAutoRefresh) alert("데이터를 불러오는데 실패했습니다. 서버 연결을 확인해주세요.");
        }
    }
    loadEvents();

    // 2-1. 실시간 연동을 위한 주기적 업데이트 (30초마다)
    setInterval(() => loadEvents(true), 30000);

    // 2-2. 자동완성 목록 업데이트
    function updateAutocomplete(events) {
        const siteNames = [...new Set(events.map(e => e.title))].filter(name => name);
        const datalist = document.getElementById('siteNameList');
        if (datalist) {
            datalist.innerHTML = '';
            siteNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                datalist.appendChild(option);
            });
        }
    }

    // 3. 모달 제어 함수
    function openModal(event = null, start = '', end = '') {
        form.reset();
        if (event) {
            document.getElementById('modalTitle').innerText = "일정 상세/수정";
            document.getElementById('eventId').value = event.id;
            document.getElementById('siteName').value = event.title;
            document.getElementById('siteColor').value = event.backgroundColor;
            document.getElementById('startDate').value = event.startStr;
            document.getElementById('endDate').value = event.endStr ? event.endStr.split('T')[0] : event.startStr;
            document.getElementById('description').value = event.extendedProps.description || "";
            deleteBtn.style.display = "block";
        } else {
            document.getElementById('modalTitle').innerText = "새 현장 일정 등록";
            document.getElementById('eventId').value = "";
            document.getElementById('startDate').value = start;
            document.getElementById('endDate').value = end || start;
            deleteBtn.style.display = "none";
        }
        modal.style.display = "block";
    }

    // 4. 저장 로직
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('eventId').value || Date.now().toString();
        const newEvent = {
            id: id,
            title: document.getElementById('siteName').value,
            color: document.getElementById('siteColor').value,
            backgroundColor: document.getElementById('siteColor').value,
            start: document.getElementById('startDate').value,
            end: document.getElementById('endDate').value,
            extendedProps: {
                description: document.getElementById('description').value
            }
        };

        const oldEvent = calendar.getEventById(id);
        if (oldEvent) oldEvent.remove();
        
        calendar.addEvent(newEvent);
        await saveToServer();
        
        modal.style.display = "none";
    };

    // 5. 삭제 로직
    deleteBtn.onclick = async function() {
        const id = document.getElementById('eventId').value;
        if (confirm("정말로 이 현장 일정을 삭제하시겠습니까?")) {
            const event = calendar.getEventById(id);
            if (event) event.remove();
            await saveToServer();
            modal.style.display = "none";
        }
    };

    // 6. 데이터 저장 (서버 API 사용)
    async function saveToServer() {
        const allEvents = calendar.getEvents().map(e => ({
            id: e.id,
            title: e.title,
            backgroundColor: e.backgroundColor,
            color: e.backgroundColor,
            start: e.startStr,
            end: e.endStr,
            description: e.extendedProps.description || (e.extendedProps && e.extendedProps.description) || ""
        }));
        
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allEvents)
            });
            if (!response.ok) throw new Error('저장 실패');
            updateAutocomplete(allEvents);
        } catch (err) {
            console.error("데이터 저장 실패:", err);
            alert("서버 저장에 실패했습니다.");
        }
    }

    closeBtn.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    };
});
