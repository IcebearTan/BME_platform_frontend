<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const rooms = ref([]);                 // [{Room_Id, Room_Name, Room_Description, Seat_Count}]
const currentRoomName = ref('');
const seats = ref([]);                 // 当前房间的座位
const users = ref([]);                 // 全量用户（绑定下拉用）

const currentRoom = computed(() => rooms.value.find(r => r.Room_Name === currentRoomName.value));

const roomDialog = ref(false);
const roomForm = reactive({ Room_Name: '', Room_Description: '' });
const bindDialog = ref(false);
const bindForm = reactive({ Seat_Id: null, User_Id: null });
const genDialog = ref(false);
const genLabels = ref('');

async function fetchRooms() {
  try {
    const res = await api({ url: '/seat/rooms', method: 'get' });
    rooms.value = res.data.rooms || [];
    if (rooms.value.length && !currentRoomName.value) {
      currentRoomName.value = rooms.value[0].Room_Name;
      fetchSeats();
    } else if (currentRoomName.value) {
      fetchSeats();
    }
  } catch (e) {
    ElMessage.error('获取自习室失败');
  }
}

async function fetchSeats() {
  if (!currentRoomName.value) { seats.value = []; return; }
  try {
    const res = await api({ url: `/seat/rooms/${currentRoomName.value}/seats`, method: 'get' });
    if (res.data.code === 200) seats.value = res.data.seats || [];
    else ElMessage.error(res.data.message || '获取座位失败');
  } catch (e) {
    ElMessage.error('获取座位失败');
  }
}

async function fetchUsers() {
  try {
    const res = await api({ url: '/user/user_list', method: 'get' });
    users.value = res.data || [];
  } catch (e) { /* ignore */ }
}

function onRoomChange() { fetchSeats(); }

async function createRoom() {
  if (!roomForm.Room_Name) { ElMessage.warning('请输入房间名'); return; }
  try {
    const res = await api({
      url: '/seat/room_create', method: 'post',
      data: { Room_Name: roomForm.Room_Name, Room_Description: roomForm.Room_Description }
    });
    if (res.data.code === 200) {
      ElMessage.success('创建成功');
      roomDialog.value = false;
      roomForm.Room_Name = ''; roomForm.Room_Description = '';
      await fetchRooms();
    } else ElMessage.error(res.data.message || '创建失败');
  } catch (e) { ElMessage.error('创建失败'); }
}

function openBind(seat) {
  bindForm.Seat_Id = seat.Seat_Id;
  bindForm.User_Id = seat.Bound_User_Id || null;
  if (!users.value.length) fetchUsers();
  bindDialog.value = true;
}

async function doBind() {
  if (!bindForm.User_Id) { ElMessage.warning('请选择用户'); return; }
  try {
    const res = await api({
      url: '/seat/seat_bind', method: 'post',
      data: { Seat_Id: bindForm.Seat_Id, User_Id: bindForm.User_Id }
    });
    if (res.data.code === 200) { ElMessage.success('绑定成功'); bindDialog.value = false; fetchSeats(); }
    else ElMessage.error(res.data.message || '绑定失败');
  } catch (e) { ElMessage.error('绑定失败'); }
}

async function unbindSeat(seat) {
  try {
    await ElMessageBox.confirm(`确定解绑座位 ${seat.Seat_Label} 的用户？`, '提示', { type: 'warning' });
    const res = await api({ url: '/seat/seat_unbind', method: 'post', data: { Seat_Id: seat.Seat_Id } });
    if (res.data.code === 200) { ElMessage.success('已解绑'); fetchSeats(); }
    else ElMessage.error(res.data.message || '解绑失败');
  } catch (e) { /* 取消 */ }
}

async function deleteSeat(seat) {
  try {
    await ElMessageBox.confirm(`确定删除座位 ${seat.Seat_Label}？`, '提示', { type: 'warning' });
    const res = await api({ url: '/seat/seat_delete', method: 'post', data: { Seat_Id: seat.Seat_Id } });
    if (res.data.code === 200) { ElMessage.success('已删除'); fetchSeats(); }
    else ElMessage.error(res.data.message || '删除失败');
  } catch (e) { /* 取消 */ }
}

function fillDefaultLabels() {
  const labels = [];
  for (const L of 'ABCDE') for (let n = 1; n <= 8; n++) labels.push(`${L}${n}`);
  genLabels.value = labels.join('\n');
}

async function generateSeats() {
  if (!currentRoom.value) { ElMessage.warning('请先选择房间'); return; }
  const labels = genLabels.value.split(/[\n,，]/).map(s => s.trim()).filter(Boolean);
  if (!labels.length) { ElMessage.warning('请输入座位标签'); return; }
  try {
    const res = await api({
      url: '/seat/seat_batch_create', method: 'post',
      data: { Room_Id: currentRoom.value.Room_Id, Labels: labels }
    });
    if (res.data.code === 200) { ElMessage.success(res.data.message || '生成成功'); genDialog.value = false; fetchSeats(); }
    else ElMessage.error(res.data.message || '生成失败');
  } catch (e) { ElMessage.error('生成失败'); }
}

onMounted(() => {
  fetchRooms();
  fetchUsers();
});
</script>

<template>
  <div style="width: 100%; height: 100%; position: relative; overflow: hidden;">
    <div class="header-container">
      <div class="l-container">座位管理</div>
      <div class="r-container">
        <el-select v-model="currentRoomName" placeholder="选择自习室" @change="onRoomChange" style="width: 150px; margin-right: 12px;">
          <el-option v-for="r in rooms" :key="r.Room_Id" :label="r.Room_Name" :value="r.Room_Name" />
        </el-select>
        <el-button type="primary" @click="genDialog = true; fillDefaultLabels()">生成座位</el-button>
        <el-button @click="roomDialog = true">新建房间</el-button>
      </div>
    </div>

    <div style="margin: 20px;">
      <div class="table">
        <el-table :data="seats" style="width: 100%; height: calc(100% - 0px);" :row-style="{ height: '44px' }">
          <el-table-column prop="Seat_Label" label="座位号" width="140" />
          <el-table-column label="绑定用户" width="200">
            <template #default="{ row }">
              {{ row.Bound_User_Name || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="160">
            <template #default="{ row }">
              <el-tag v-if="row.Occupied" type="success">学习中</el-tag>
              <el-tag v-else-if="row.Bound_User_Name" type="info">未打卡</el-tag>
              <el-tag v-else type="warning">未分配</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" min-width="240">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="openBind(row)">{{ row.Bound_User_Id ? '换绑' : '绑定' }}</el-button>
              <el-button size="small" :disabled="!row.Bound_User_Id" @click="unbindSeat(row)">解绑</el-button>
              <el-button size="small" type="danger" @click="deleteSeat(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新建房间 -->
    <el-dialog v-model="roomDialog" title="新建自习室" width="440">
      <el-form label-width="72px">
        <el-form-item label="房间名">
          <el-input v-model="roomForm.Room_Name" placeholder="如 106" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roomForm.Room_Description" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roomDialog = false">取消</el-button>
        <el-button type="primary" @click="createRoom">确认</el-button>
      </template>
    </el-dialog>

    <!-- 绑定用户 -->
    <el-dialog v-model="bindDialog" title="绑定用户到座位" width="440">
      <el-form label-width="72px">
        <el-form-item label="用户">
          <el-select v-model="bindForm.User_Id" filterable placeholder="搜索用户名" style="width: 100%">
            <el-option v-for="u in users" :key="u.User_Id" :label="`${u.User_Name} (${u.User_Id})`" :value="u.User_Id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialog = false">取消</el-button>
        <el-button type="primary" @click="doBind">确认绑定</el-button>
      </template>
    </el-dialog>

    <!-- 批量生成座位 -->
    <el-dialog v-model="genDialog" title="批量生成座位" width="480">
      <el-form label-width="80px">
        <el-form-item label="房间">
          {{ currentRoom ? currentRoom.Room_Name : '请先选择房间' }}
        </el-form-item>
        <el-form-item label="座位标签">
          <el-input v-model="genLabels" type="textarea" :rows="6" placeholder="每行一个标签，如 A1" />
          <el-button size="small" @click="fillDefaultLabels" style="margin-top: 8px;">填充 A1-E8（40 座）</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="genDialog = false">取消</el-button>
        <el-button type="primary" @click="generateSeats">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px;
  height: 40px;
}
.header-container .l-container {
  display: inline-block;
  font-size: 30px;
  font-weight: 900;
  margin-left: 20px;
  color: #3b5cd5;
}
.header-container .r-container {
  display: flex;
  align-items: center;
}
.table {
  width: 100%;
  height: calc(100vh - 220px);
  max-height: 600px;
  border-radius: 10px;
  border: 1px solid #C4C4C4;
  box-shadow: 0px 5px 10px 1px #f7f7f7;
  overflow: hidden;
}
</style>
