const getMachineStatus = async (req, res) => {
    try {
    const currentStatus = "idle"; // ตัวอย่างสถานะเครื่อง (สามารถปรับให้ดึงข้อมูลจริงได้)
    res.status(200).json({ status: currentStatus });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export default {
    getMachineStatus,
};