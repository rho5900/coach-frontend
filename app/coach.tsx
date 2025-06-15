// Full CoachScreen with Generate Team Message Button

import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { db } from '@/constants/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import {
  collection,
  query,
  where,
  getDoc,
  doc,
  addDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';

const SENTIMENT_LABELS: Record<string, string> = {
  Positive: 'Thriving',
  Neutral: 'Stable',
  'Red Flag': 'Needs Support'
};

type ReflectionEntry = {
  athlete: string;
  name?: string | null;
  sentiment: string;
  score: number;
  timestamp?: { toMillis: () => number };
};

export default function CoachScreen() {
  const { user, role, loading: authLoading } = useAuth();
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [teamOutlook, setTeamOutlook] = useState({
    thriving: 0,
    stable: 0,
    needsSupport: 0,
    summary: '',
    avgScore: 0,
  });
  const router = useRouter();

  const handleShare = async (sim: any) => {
    try {
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      await addDoc(collection(db, 'coachFeed'), {
        coachUid: user.uid,
        coachName: userDoc.data()?.name || '',
        simulation: {
          profile: sim.profile,
          chat_history: sim.chat_history,
          evaluation: sim.evaluation || '',
          timestamp: sim.timestamp,
        },
        timestamp: new Date(),
        comments: [],
      });

      Alert.alert('Shared!', 'Simulation posted to the coach feed.');
    } catch (err) {
      console.error('Error sharing to feed:', err);
      Alert.alert('Error', 'Could not share this post.');
    }
  };

  useEffect(() => {
    if (!user) return;

    let unsubReflections: (() => void) | null = null;
    let unsubSimulations: (() => void) | null = null;

    (async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const teamId = userDoc.data()?.teamId;
      if (!teamId) return;

      const q = query(collection(db, 'reflections'), where('teamId', '==', teamId));
      unsubReflections = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const raw = snapshot.docs.map(doc => doc.data());

        const aliasMap = new Map<string, string>();
        let anonCount = 1;

        const clean = raw.map((item) => {
          const uid = item.userId || item.athlete;
          let displayName = item.name ?? item.athlete;

          if (item.anonymous) {
            if (!aliasMap.has(uid)) {
              aliasMap.set(uid, `Anonymous ${anonCount++}`);
            }
            displayName = aliasMap.get(uid)!;
          }

          return {
            athlete: uid,
            name: displayName,
            sentiment: item.sentiment || 'Neutral',
            score: typeof item.score === 'number' ? item.score : 5,
            timestamp: item.timestamp,
          };
        });

        const grouped = new Map<string, ReflectionEntry[]>();
        clean.forEach(item => {
          const key = item.athlete;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)?.push(item);
        });

        const summaries = Array.from(grouped.entries()).map(([athlete, items]) => {
          const total = items.reduce((sum, r) => sum + r.score, 0);
          const avg = total / items.length;
          const last = items.sort(
            (a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)
          )[0];

          return {
            name: last.name || athlete,
            athlete,
            score: avg,
            sentiment: last.sentiment,
            timestamp: last.timestamp,
          };
        });

        setReflections(summaries);
      });

      const simQ = query(collection(db, 'simulations'), where('teamId', '==', teamId));
      unsubSimulations = onSnapshot(simQ, (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs
          .map(doc => doc.data())
          .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
        setSimulations(data);
      });
    })();

    return () => {
      unsubReflections?.();
      unsubSimulations?.();
    };
  }, [user]);

  useEffect(() => {
    let thriving = 0, stable = 0, needsSupport = 0, totalScore = 0;

    reflections.forEach((r) => {
      const score = r.score;
      if (score >= 8) thriving++;
      else if (score >= 5) stable++;
      else needsSupport++;

      totalScore += score;
    });

    const avgScore = reflections.length > 0 ? totalScore / reflections.length : 0;

    let summary = '';
    if (avgScore > 8) summary = 'Team is thriving today!';
    else if (avgScore > 6) summary = 'Team is mostly stable.';
    else if (avgScore > 4) summary = 'Team outlook is mixed.';
    else if (avgScore > 2) summary = 'Team needs support. Some concern.';
    else summary = 'Team outlook is critical. Most athletes need attention.';

    setTeamOutlook({ thriving, stable, needsSupport, summary, avgScore });
  }, [reflections]);

  if (authLoading) return null;
  if (role !== 'coach') return <Redirect href="/athlete" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'black', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 20 }}>
        Coach Dashboard
      </Text>

      <View style={{ backgroundColor: '#222', padding: 16, borderRadius: 10, marginBottom: 20 }}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
          Overall Team Outlook
        </Text>
        <Text style={{ color: '#ccc', marginBottom: 4 }}>
          {teamOutlook.summary} (Avg: {teamOutlook.avgScore.toFixed(2)})
        </Text>
        <Text style={{ color: '#ccc', fontSize: 14 }}>
          Thriving: {teamOutlook.thriving} | Stable: {teamOutlook.stable} | Needs Support: {teamOutlook.needsSupport}
        </Text>
        <Button
          title="Generate Team Message"
          onPress={async () => {
            try {
              const res = await fetch('https://coach-backend-hnvv.onrender.com/team_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  avgScore: teamOutlook.avgScore,
                  summary: teamOutlook.summary,
                }),
              });
              const data = await res.json();
              Alert.alert('Suggested Message', data.message);
            } catch (err) {
              console.error('Failed to generate message', err);
              Alert.alert('Error', 'Could not generate a team message.');
            }
          }}
          color="#16a34a"
        />
      </View>

      <View style={{ marginBottom: 20 }}>
        <Button title="Start Simulation" onPress={() => router.push('/simchat')} color="#4c8bf5" />
        <Button title="Go to Coach Feed" onPress={() => router.push('/feed')} color="#5ca0ff" />
        <Button title="View Leaderboard" onPress={() => router.push('/ranking')} color="#facc15" />
      </View>

      {reflections.map((r, index) => (
        <View
          key={index}
          style={{
            backgroundColor:
              r.score >= 8 ? '#003c00' :
              r.score >= 5 ? '#2d2d2d' :
              r.score >= 3 ? '#8a4d00' :
              '#5c0000',
            padding: 20,
            marginBottom: 10,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
            {r.name || r.athlete}
          </Text>
          <Text style={{ color: 'white', marginTop: 5 }}>
            Score: {r.score.toFixed(1)} ({SENTIMENT_LABELS[r.sentiment] || r.sentiment})
          </Text>
        </View>
      ))}

      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginVertical: 20,
        }}
      >
        Simulation History
      </Text>

      {simulations.map((sim, index) => (
        <View key={index} style={{ backgroundColor: '#1a1a1a', padding: 16, marginBottom: 12, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
            {sim.profile?.sport} | Age: {sim.profile?.age}
          </Text>
          <Text style={{ color: 'white', marginTop: 4 }}>
            Context: {sim.profile?.context}
          </Text>
          <Text style={{ color: '#ccc', marginTop: 6 }} numberOfLines={3}>
            Last Message: {sim.chat_history?.[sim.chat_history.length - 1]?.message}
          </Text>
          {sim.evaluation && (
            <Button title="Share to Coach Feed" color="#888" onPress={() => handleShare(sim)} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}
