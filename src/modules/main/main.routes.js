
import { Router } from "express";

const router = Router();


router.get("home", (req, res) => {
    console.log("Welcome home because all just started and is for testing");
    
});

export default router;