import { useGameStore } from '../../../store/gameStore';
import styles from './LunhuiPages.module.css';

interface RoomEntry {
  key: string;
  name: string;
  desc: string;
  status: string;
}

const ROOMS: RoomEntry[] = [
  { key: 'yard', name: '前 庭', desc: '每日领取金币与木材产出，可托管离线挂机。', status: '一阶 · 未升级' },
  { key: 'bed', name: '卧 房', desc: '提升离线托管时长与体力恢复速度。', status: '一阶 · 未升级' },
  { key: 'forge', name: '工 坊', desc: '产出强化材料与家园装饰摆件。', status: '一阶 · 未升级' },
  { key: 'garden', name: '花 园', desc: '种植花苗、收获缘分信物，关联缘分系统。', status: '未开垦' },
];

export default function HousingPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>家 园</span>
            <span className={styles.appbarZone}>雪镇小院 · 一阶院落</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('flower')} type="button">花</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('friend')} type="button">友</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.guJoinBanner}>
          <div className={styles.guJoinTitle}>墨 染 小 筑</div>
          <div className={styles.guJoinSub}>家园是经济与休闲系统的一部分 · 支持扩建 / 串门 / 收益</div>
        </div>

        <div className={styles.sectRow}>
          房 间 一 览
          <span className={styles.sectMore}>共 {ROOMS.length} 间</span>
        </div>

        <div className={styles.guMembers}>
          {ROOMS.map((room) => (
            <div key={room.key} className={styles.guMember}>
              <div className={styles.guMemberAv}>{room.name.slice(0, 1)}</div>
              <div className={styles.guMemberInfo}>
                <div className={styles.guMemberNm}>{room.name}</div>
                <div className={styles.guMemberSt}>{room.desc}</div>
              </div>
              <div className={styles.guMemberContribution}>{room.status}</div>
            </div>
          ))}
        </div>

        <div className={styles.guActions}>
          <button className={styles.guAct} onClick={() => navigateTo('flower')} type="button">花 园</button>
          <button className={styles.guAct} onClick={() => navigateTo('friend')} type="button">串 门</button>
          <button className={styles.guAct} onClick={() => navigateTo('status')} type="button">返 回</button>
        </div>
      </div>
    </div>
  );
}
